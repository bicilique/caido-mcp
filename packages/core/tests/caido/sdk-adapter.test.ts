import { describe, expect, it } from "vitest";

import { AgentError } from "../../src/errors.js";
import {
  SdkCaidoAdapter,
  type CaidoSdkClient,
} from "../../src/caido/sdk-adapter.js";

class Builder<T> {
  readonly calls: Array<readonly unknown[]> = [];

  constructor(private readonly connection: T) {}

  first(limit: number): this {
    this.calls.push(["first", limit]);
    return this;
  }

  after(cursor: string): this {
    this.calls.push(["after", cursor]);
    return this;
  }

  filter(query: string): this {
    this.calls.push(["filter", query]);
    return this;
  }

  ascending(target: string, field: string): this {
    this.calls.push(["ascending", target, field]);
    return this;
  }

  descending(target: string, field: string): this {
    this.calls.push(["descending", target, field]);
    return this;
  }

  includeRaw(value: unknown): this {
    this.calls.push(["includeRaw", value]);
    return this;
  }

  async execute(): Promise<T> {
    return this.connection;
  }
}

function connection<T>(nodes: readonly T[], nextCursor?: string) {
  return {
    edges: nodes.map((node, index) => ({ cursor: `cursor-${index}`, node })),
    pageInfo: {
      hasNextPage: nextCursor !== undefined,
      hasPreviousPage: false,
      startCursor: nodes.length === 0 ? undefined : "cursor-0",
      endCursor: nextCursor,
    },
  };
}

function sdkFixture() {
  const requestBuilder = new Builder(
    connection(
      [
        {
          request: {
            id: "request-1",
            host: "example.com",
            port: 443,
            method: "GET",
            path: "/login",
            query: "next=%2F",
            isTls: true,
            metadata: { id: "request-1" },
            createdAt: new Date("2026-07-25T00:00:00.000Z"),
            raw: new TextEncoder().encode(
              "GET /login?next=%2F HTTP/1.1\r\nHost: example.com\r\nContent-Type: text/plain\r\n\r\nhello",
            ),
          },
          response: {
            id: "response-1",
            statusCode: 200,
            roundtripTime: 12,
            length: 43,
            createdAt: new Date("2026-07-25T00:00:01.000Z"),
            raw: new TextEncoder().encode(
              "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nworld",
            ),
          },
        },
      ],
      "next-request",
    ),
  );
  const findingsBuilder = new Builder(
    connection(
      [
        {
          id: "finding-1",
          requestId: "request-1",
          title: "Reflected input",
          reporter: "scanner",
          description: "Input is reflected.",
          dedupeKey: undefined,
          host: "example.com",
          path: "/login",
          hidden: false,
          createdAt: new Date("2026-07-25T00:00:00.000Z"),
        },
      ],
      "next-finding",
    ),
  );
  const replayEntryBuilder = new Builder(
    connection([{ id: "entry-1" }, { id: "entry-2" }]),
  );
  const replayBuilder = new Builder(
    connection(
      [
        {
          id: "session-1",
          name: "Login replay",
          collectionId: "collection-1",
          activeEntryId: "entry-2",
          entries: () => replayEntryBuilder,
        },
      ],
      "next-session",
    ),
  );
  const events: string[] = [];
  const client = {
    health: async () => ({ name: "caido", version: "0.57.1", ready: true }),
    project: {
      list: async () => [
        {
          id: "project-1",
          name: "Assessment",
          path: "/tmp/project",
          status: "READY",
          temporary: false,
          createdAt: new Date("2026-07-25T00:00:00.000Z"),
          updatedAt: new Date("2026-07-25T00:00:00.000Z"),
          version: "0.57.1",
          size: 10,
          readOnly: false,
        },
      ],
      select: async (id: string) => {
        events.push(`select:${id}`);
        return {
          id,
          name: "Assessment",
          path: "/tmp/project",
          status: "READY",
          temporary: false,
          createdAt: new Date("2026-07-25T00:00:00.000Z"),
          updatedAt: new Date("2026-07-25T00:00:00.000Z"),
          version: "0.57.1",
          size: 10,
          readOnly: false,
        };
      },
    },
    request: {
      list: () => requestBuilder,
      get: async (id: string) =>
        id === "request-1"
          ? requestBuilder["connection"].edges[0]?.node
          : undefined,
    },
    scope: {
      list: async () => [
        {
          id: "scope-1",
          name: "Target",
          allowlist: ["example.com"],
          denylist: ["admin.example.com"],
          indexed: true,
        },
      ],
    },
    finding: {
      list: () => findingsBuilder,
      get: async (id: string) =>
        id === "finding-1"
          ? findingsBuilder["connection"].edges[0]?.node
          : undefined,
      create: async (requestId: string, input: { title: string }) => {
        events.push(`create-finding:${requestId}:${input.title}`);
        return findingsBuilder["connection"].edges[0]?.node;
      },
      update: async (id: string, input: { title: string }) => {
        events.push(`update-finding:${id}:${input.title}`);
        return findingsBuilder["connection"].edges[0]?.node;
      },
    },
    replay: {
      sessions: {
        list: () => replayBuilder,
        create: async () => {
          events.push("create-replay-session");
          return { id: "session-created" };
        },
      },
      send: async (sessionId: string) => {
        events.push(`send-replay:${sessionId}`);
        return {
          status: "DONE",
          entry: { id: "entry-created", request: { id: "request-created" } },
        };
      },
    },
    workflow: {
      list: async () => [
        {
          id: "workflow-1",
          name: "Normalize",
          kind: "CONVERT",
          definition: {},
          enabled: true,
          global: false,
          readOnly: false,
          createdAt: new Date("2026-07-25T00:00:00.000Z"),
          updatedAt: new Date("2026-07-25T00:00:00.000Z"),
        },
      ],
    },
    filter: {
      list: async () => [
        {
          id: "filter-1",
          name: "JSON",
          alias: "json",
          clause: 'resp.headers.content_type.cont:"json"',
          kind: "HTTPQL",
        },
      ],
    },
    close: async () => {
      events.push("close");
    },
  };

  return {
    adapter: new SdkCaidoAdapter(client as unknown as CaidoSdkClient),
    events,
    requestBuilder,
    findingsBuilder,
    replayBuilder,
  };
}

describe("SdkCaidoAdapter", () => {
  it("maps health, projects, requests, scopes, findings, replay, workflows, and filters", async () => {
    const { adapter, requestBuilder, findingsBuilder, replayBuilder } =
      sdkFixture();

    expect(await adapter.health()).toEqual({
      reachable: true,
      authenticated: true,
      version: "0.57.1",
    });
    expect(await adapter.listProjects({ limit: 20 })).toEqual({
      items: [{ id: "project-1", name: "Assessment", selected: false }],
    });
    expect(
      await adapter.listRequests({
        httpql: 'req.host.eq:"example.com"',
        cursor: "request-cursor",
        direction: "descending",
        limit: 10,
      }),
    ).toEqual({
      nextCursor: "next-request",
      items: [
        {
          id: "request-1",
          method: "GET",
          host: "example.com",
          path: "/login",
          scheme: "https",
          port: 443,
          statusCode: 200,
          responseLength: 43,
          createdAt: "2026-07-25T00:00:00.000Z",
        },
      ],
    });
    expect(requestBuilder.calls).toEqual([
      ["includeRaw", { request: false, response: false }],
      ["filter", 'req.host.eq:"example.com"'],
      ["after", "request-cursor"],
      ["descending", "req", "created_at"],
      ["first", 10],
    ]);
    expect(JSON.stringify(await adapter.listRequests({
      direction: "descending",
      limit: 1,
    }))).not.toMatch(/next=%2F|Authorization|hello|world/);
    expect(await adapter.listScopes()).toEqual([
      {
        id: "scope-1",
        name: "Target",
        selected: true,
        rules: [
          { action: "allow", host: "example.com" },
          { action: "deny", host: "admin.example.com" },
        ],
      },
    ]);
    expect(await adapter.listFindings({ cursor: "finding-cursor", limit: 5 }))
      .toEqual({
        items: [
          {
            id: "finding-1",
            title: "Reflected input",
            severity: "unknown",
            requestIds: ["request-1"],
          },
        ],
        nextCursor: "next-finding",
      });
    expect(findingsBuilder.calls).toEqual([
      ["after", "finding-cursor"],
      ["first", 5],
    ]);
    expect(await adapter.getFinding("finding-1")).toMatchObject({
      id: "finding-1",
      description: "Input is reflected.",
      evidence: "https://example.com/login",
    });
    expect(await adapter.listReplaySessions({ limit: 2 })).toEqual({
      items: [
        {
          id: "session-1",
          name: "Login replay",
          entryIds: ["entry-1", "entry-2"],
        },
      ],
      nextCursor: "next-session",
    });
    expect(replayBuilder.calls).toEqual([["first", 2]]);
    expect(await adapter.listWorkflows({ limit: 20 })).toEqual({
      items: [{ id: "workflow-1", name: "Normalize", enabled: true }],
    });
    expect(await adapter.listFilters({ limit: 20 })).toEqual({
      items: [
        {
          id: "filter-1",
          name: "JSON",
          query: 'resp.headers.content_type.cont:"json"',
        },
      ],
    });
  });

  it("tracks selected project state and closes the SDK boundary cleanly", async () => {
    const { adapter, events } = sdkFixture();

    expect(await adapter.selectProject("project-1")).toEqual({
      projectId: "project-1",
      requestIds: [],
      mutation: "select_project",
    });
    expect(await adapter.getCurrentProject()).toEqual({
      id: "project-1",
      name: "Assessment",
      selected: true,
    });
    await adapter.close();

    expect(events).toEqual(["select:project-1", "close"]);
  });

  it("maps supported finding and Replay mutations through the official SDK surface", async () => {
    const { adapter, events } = sdkFixture();

    expect(
      await adapter.updateFinding("finding-1", {
        title: "Confirmed reflected input",
      }),
    ).toEqual({
      requestIds: ["request-1"],
      mutation: "update_finding",
    });
    expect(
      await adapter.replayRequest("request-1", {
        headers: [["Host", "example.com"]],
        body: new TextEncoder().encode("updated"),
        contentType: "text/plain",
      }),
    ).toEqual({
      requestIds: ["request-1", "request-created"],
      mutation: "replay_request",
    });
    expect(
      await adapter.sendRawRequest({
        method: "POST",
        url: "https://example.com/submit",
        headers: [["Content-Type", "text/plain"]],
        body: new TextEncoder().encode("body"),
      }),
    ).toEqual({
      requestIds: ["request-created"],
      mutation: "send_raw_request",
    });
    expect(events).toEqual([
      "update-finding:finding-1:Confirmed reflected input",
      "create-replay-session",
      "send-replay:session-created",
      "create-replay-session",
      "send-replay:session-created",
    ]);
  });

  it.each([
    [
      "create severity",
      (adapter: SdkCaidoAdapter) =>
        adapter.createFinding({
          title: "Unsupported severity",
          severity: "high",
          requestIds: ["request-1"],
          description: "Description",
          evidence: "",
        }),
    ],
    [
      "create multiple request IDs",
      (adapter: SdkCaidoAdapter) =>
        adapter.createFinding({
          title: "Multiple requests",
          severity: "",
          requestIds: ["request-1", "request-2"],
          description: "Description",
          evidence: "",
        }),
    ],
    [
      "update severity",
      (adapter: SdkCaidoAdapter) =>
        adapter.updateFinding("finding-1", { severity: "critical" }),
    ],
    [
      "update request IDs",
      (adapter: SdkCaidoAdapter) =>
        adapter.updateFinding("finding-1", { requestIds: ["request-2"] }),
    ],
    [
      "create empty severity property",
      (adapter: SdkCaidoAdapter) =>
        adapter.createFinding({
          title: "Empty severity",
          severity: "",
          description: "Description",
          evidence: "",
        } as never),
    ],
    [
      "create empty request IDs property",
      (adapter: SdkCaidoAdapter) =>
        adapter.createFinding({
          title: "Empty requests",
          requestIds: [],
          description: "Description",
          evidence: "",
        } as never),
    ],
    [
      "update empty severity property",
      (adapter: SdkCaidoAdapter) =>
        adapter.updateFinding("finding-1", { severity: "" }),
    ],
    [
      "update empty request IDs property",
      (adapter: SdkCaidoAdapter) =>
        adapter.updateFinding("finding-1", { requestIds: [] }),
    ],
  ])("rejects unsupported finding field by presence: %s", async (_name, call) => {
    const { adapter, events } = sdkFixture();

    await expect(call(adapter)).rejects.toEqual(
      expect.objectContaining<Partial<AgentError>>({
        code: "TOOL_DISABLED",
        retryable: false,
      }),
    );
    expect(events).toEqual([]);
  });

  it.each([
    ["listSitemap", (adapter: SdkCaidoAdapter) => adapter.listSitemap(3, 20)],
    ["setIntercept", (adapter: SdkCaidoAdapter) => adapter.setIntercept(true)],
    ["runWorkflow", (adapter: SdkCaidoAdapter) => adapter.runWorkflow("workflow-1")],
  ])("returns a typed error when %s lacks required SDK inputs", async (_name, call) => {
    const { adapter } = sdkFixture();

    await expect(call(adapter)).rejects.toEqual(
      expect.objectContaining<Partial<AgentError>>({
        code: "TOOL_DISABLED",
        retryable: false,
      }),
    );
  });
});
