import { describe, expect, it } from "vitest";

import { AgentError } from "../../src/errors.js";
import {
  SdkCaidoAdapter,
  type CaidoSdkClient,
} from "../../src/caido/sdk-adapter.js";

class Builder<T> {
  readonly calls: Array<readonly unknown[]> = [];
  failure: unknown;

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
    if (this.failure !== undefined) throw this.failure;
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
  const sentRaw: Uint8Array[] = [];
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
      create: async (
        requestId: string,
        input: { title: string; description?: string; reporter: string },
      ) => {
        events.push(
          `create-finding:${requestId}:${input.title}:${input.description}:${input.reporter}`,
        );
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
      send: async (
        sessionId: string,
        options: { raw: string | Uint8Array },
      ) => {
        events.push(`send-replay:${sessionId}`);
        sentRaw.push(
          typeof options.raw === "string"
            ? Uint8Array.from(Buffer.from(options.raw, "latin1"))
            : new Uint8Array(options.raw),
        );
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
      run: async (input: {
        kind: "active";
        id: string;
        requestId: string;
      }) => {
        events.push(`run-workflow:${input.id}:${input.requestId}`);
        return { id: "workflow-task-1" };
      },
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
    client,
    events,
    requestBuilder,
    findingsBuilder,
    replayEntryBuilder,
    replayBuilder,
    sentRaw,
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
      await adapter.createFinding({
        title: "Reflected input",
        description: "Input is reflected.",
        requestId: "request-1",
      }),
    ).toEqual({
      requestIds: ["request-1"],
      mutation: "create_finding",
    });
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
        headers: [["X-Test", "safe"]],
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
      "create-finding:request-1:Reflected input:Input is reflected.:caido-agent-kit",
      "update-finding:finding-1:Confirmed reflected input",
      "create-replay-session",
      "send-replay:session-created",
      "create-replay-session",
      "send-replay:session-created",
    ]);
  });

  it("runs one active workflow against one explicit request ID", async () => {
    const { adapter, events } = sdkFixture();

    await expect(
      adapter.runWorkflow("workflow-1", "request-1"),
    ).resolves.toEqual({
      requestIds: ["request-1"],
      mutation: "run_workflow",
    });
    expect(events).toEqual(["run-workflow:workflow-1:request-1"]);
  });

  it.each([
    { headers: [["Host", "evil.test"]] },
    { headers: [["X-Test", "safe\r\nInjected: yes"]] },
    { headers: [["Bad Header", "safe"]] },
    { headers: [["X-Test", "safe\u0000value"]] },
  ] as const)("rejects unsafe raw headers before Replay serialization: $headers", async ({ headers }) => {
    const { adapter, events } = sdkFixture();

    await expect(
      adapter.sendRawRequest({
        method: "GET",
        url: "https://example.com/",
        headers,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AgentError>>({
        code: "INVALID_INPUT",
        retryable: false,
      }),
    );
    expect(events).toEqual([]);
  });

  it("accepts a safe raw header at the adapter boundary", async () => {
    const { adapter, events } = sdkFixture();

    await expect(
      adapter.sendRawRequest({
        method: "GET",
        url: "https://example.com/",
        headers: [["X-Safe", "bounded value"]],
      }),
    ).resolves.toMatchObject({ mutation: "send_raw_request" });
    expect(events).toEqual([
      "create-replay-session",
      "send-replay:session-created",
    ]);
  });

  it.each([
    ["http://127.0.0.1:18080/path", "Host: 127.0.0.1:18080\r\n"],
    ["http://[::1]:18080/path", "Host: [::1]:18080\r\n"],
    ["http://127.0.0.1:80/path", "Host: 127.0.0.1\r\n"],
    ["https://[::1]:443/path", "Host: [::1]\r\n"],
  ] as const)(
    "serializes the exact HTTP Host authority for %s",
    async (url, expectedHostLine) => {
      const { adapter, sentRaw } = sdkFixture();

      await adapter.sendRawRequest({ method: "GET", url, headers: [] });

      expect(Buffer.from(sentRaw[0]!).toString("latin1")).toContain(
        expectedHostLine,
      );
    },
  );

  it("includes a stored request's non-default port in Replay Host bytes", async () => {
    const { adapter, requestBuilder, sentRaw } = sdkFixture();
    const pair = requestBuilder["connection"].edges[0]!.node;
    pair.request.host = "127.0.0.1";
    pair.request.port = 18080;
    pair.request.isTls = false;

    await adapter.replayRequest("request-1", {
      headers: [],
      body: new Uint8Array(),
      contentType: "text/plain",
    });

    expect(Buffer.from(sentRaw[0]!).toString("latin1")).toContain(
      "Host: 127.0.0.1:18080\r\n",
    );
  });

  it.each([
    [
      "scope listing transport failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.scope.list = async () => {
          throw new Error("socket reset");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) => adapter.listScopes(),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "finding detail authentication failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.finding.get = async () => {
          throw new Error("401 Unauthorized");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.getFinding("finding-1"),
      "AUTH_FAILED",
      false,
    ],
    [
      "finding creation transport failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.finding.create = async () => {
          throw new Error("connection refused");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.createFinding({
          title: "Finding",
          description: "Evidence",
          requestId: "request-1",
        }),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "Replay entry listing transport failure",
      ({ replayEntryBuilder }: ReturnType<typeof sdkFixture>) => {
        replayEntryBuilder.failure = new Error("socket reset");
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.listReplaySessions({ limit: 10 }),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "Replay request lookup transport failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.request.get = async () => {
          throw new Error("connection refused");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.replayRequest("request-1", {
          headers: [],
          body: new Uint8Array(),
          contentType: "text/plain",
        }),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "Replay session creation transport failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.replay.sessions.create = async () => {
          throw new Error("connection refused");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.sendRawRequest({
          method: "GET",
          url: "https://example.com/",
          headers: [],
        }),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "Replay send authentication failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.replay.send = async () => {
          throw new Error("401 Unauthorized");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.sendRawRequest({
          method: "GET",
          url: "https://example.com/",
          headers: [],
        }),
      "AUTH_FAILED",
      false,
    ],
    [
      "workflow run transport failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.workflow.run = async () => {
          throw new Error("socket reset");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.runWorkflow("workflow-1", "request-1"),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "filter listing transport failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.filter.list = async () => {
          throw new Error("connection refused");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.listFilters({ limit: 10 }),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "project selection transport failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.project.select = async () => {
          throw new Error("socket reset");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.selectProject("project-1"),
      "UPSTREAM_ERROR",
      true,
    ],
    [
      "project selection positive not-found failure",
      ({ client }: ReturnType<typeof sdkFixture>) => {
        client.project.select = async () => {
          throw new Error("Project not found");
        };
      },
      ({ adapter }: ReturnType<typeof sdkFixture>) =>
        adapter.selectProject("missing-project"),
      "NOT_FOUND",
      false,
    ],
  ] as const)(
    "maps %s through a deterministic SDK boundary",
    async (_name, arrange, act, code, retryable) => {
      const fixture = sdkFixture();
      arrange(fixture);

      await expect(act(fixture)).rejects.toEqual(
        expect.objectContaining<Partial<AgentError>>({ code, retryable }),
      );
    },
  );

  it("preserves the deterministic Replay status failure", async () => {
    const { adapter, client } = sdkFixture();
    client.replay.send = async () => ({
      status: "CANCELLED",
      entry: { id: "entry-cancelled" },
    });

    await expect(
      adapter.sendRawRequest({
        method: "GET",
        url: "https://example.com/",
        headers: [],
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AgentError>>({
        code: "UPSTREAM_ERROR",
        retryable: false,
      }),
    );
  });

  it("maps SDK close failures through the same deterministic boundary", async () => {
    const { adapter, client } = sdkFixture();
    client.close = async () => {
      throw new Error("socket reset");
    };

    await expect(adapter.close()).rejects.toEqual(
      expect.objectContaining<Partial<AgentError>>({
        code: "UPSTREAM_ERROR",
        retryable: true,
      }),
    );
  });

  it.each([
    [
      "create severity property",
      (adapter: SdkCaidoAdapter) =>
        Reflect.apply(adapter.createFinding, adapter, [
          {
            title: "Unsupported severity",
            description: "Description",
            requestId: "request-1",
            severity: "",
          },
        ]),
    ],
    [
      "create requestIds property",
      (adapter: SdkCaidoAdapter) =>
        Reflect.apply(adapter.createFinding, adapter, [
          {
            title: "Multiple requests",
            description: "Description",
            requestIds: ["request-1", "request-2"],
          },
        ]),
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
      "create evidence property",
      (adapter: SdkCaidoAdapter) =>
        Reflect.apply(adapter.createFinding, adapter, [
          {
            title: "Unsupported evidence",
            description: "Description",
            requestId: "request-1",
            evidence: "",
          },
        ]),
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

  it("rejects an empty supported create request ID before SDK mutation", async () => {
    const { adapter, events } = sdkFixture();

    await expect(
      adapter.createFinding({
        title: "Missing request",
        description: "Description",
        requestId: "",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AgentError>>({
        code: "INVALID_INPUT",
        retryable: false,
      }),
    );
    expect(events).toEqual([]);
  });

  it("rejects an omitted create request ID without an incidental TypeError", async () => {
    const { adapter, events } = sdkFixture();

    await expect(
      Reflect.apply(adapter.createFinding, adapter, [
        {
          title: "Missing request",
          description: "Description",
        },
      ]),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AgentError>>({
        code: "INVALID_INPUT",
        retryable: false,
      }),
    );
    expect(events).toEqual([]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["primitive", 42],
    ["array", []],
  ])(
    "rejects non-object create input without an incidental TypeError: %s",
    async (_name, input) => {
      const { adapter, events } = sdkFixture();

      await expect(
        Reflect.apply(adapter.createFinding, adapter, [input]),
      ).rejects.toEqual(
        expect.objectContaining<Partial<AgentError>>({
          code: "INVALID_INPUT",
          retryable: false,
        }),
      );
      expect(events).toEqual([]);
    },
  );

  it.each([
    ["listSitemap", (adapter: SdkCaidoAdapter) => adapter.listSitemap(3, 20)],
    ["setIntercept", (adapter: SdkCaidoAdapter) => adapter.setIntercept(true)],
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
