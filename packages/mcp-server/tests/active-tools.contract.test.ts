import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuditEvent } from "../../core/src/security/audit-log.js";
import type { RegistrationMode } from "../src/registry.js";
import { createServer } from "../src/server.js";
import { createToolExecutor } from "../src/execution/pipeline.js";
import { createActiveTools } from "../src/tools/active/index.js";
import { createReadOnlyTools } from "../src/tools/read/index.js";
import { createTestAdapter } from "./support/adapter.js";

const activeNames = [
  "caido_create_finding",
  "caido_replay_request",
  "caido_run_workflow",
  "caido_select_project",
  "caido_send_raw_request",
  "caido_set_intercept",
  "caido_update_finding",
];

const closers: Array<() => Promise<void>> = [];
afterEach(async () => Promise.all(closers.splice(0).map((close) => close())));

async function harness(
  mode: RegistrationMode,
  adapter = createTestAdapter(),
  requestTimeoutMs = 1_000,
) {
  const audit: AuditEvent[] = [];
  const server = createServer({
    mode,
    executor: createToolExecutor({
      config: {
        caidoUrl: "http://127.0.0.1:8080",
        mode,
        requireScope: true,
        allowSensitiveHeaders: false,
        bodyLimit: 4096,
        maxBatch: 20,
        requestTimeoutMs,
        auditLog: "/unused/audit.jsonl",
        tokenCache: "/unused/tokens.json",
      },
      auditLogger: {
        record: async (event) => {
          audit.push(event);
        },
      },
      rateLimiter: { consume: () => undefined },
    }),
    tools: [
      ...createReadOnlyTools(adapter, { bodyLimit: 4096, maxBatch: 20 }),
      ...createActiveTools(adapter, { bodyLimit: 4096, maxBatch: 20 }),
    ],
  });
  const client = new Client({ name: "active-contract", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return { client, audit };
}

function selectedScope(
  rules: readonly {
    action: "allow" | "deny";
    host: string;
    scheme?: "http" | "https";
    port?: number;
  }[],
) {
  return [
    {
      id: "scope-1",
      name: "Dedicated active test scope",
      selected: true,
      rules,
    },
  ];
}

describe("active tool catalog", () => {
  it.each(["read-only", "admin"] as const)(
    "does not register active tools in %s mode",
    async (mode) => {
      const { client } = await harness(mode);
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name)).not.toEqual(
        expect.arrayContaining(activeNames),
      );
    },
  );

  it("registers exactly seven strict active tools with mutation annotations", async () => {
    const { client } = await harness("active");
    const { tools } = await client.listTools();
    const active = tools.filter((tool) => activeNames.includes(tool.name));

    expect(active.map((tool) => tool.name).sort()).toEqual(activeNames);
    for (const tool of active) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
      expect(tool.outputSchema).toMatchObject({ type: "object" });
    }
    expect(
      Object.fromEntries(active.map((tool) => [tool.name, tool.annotations])),
    ).toEqual({
      caido_select_project: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      caido_replay_request: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      caido_send_raw_request: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      caido_create_finding: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      caido_update_finding: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      caido_set_intercept: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      caido_run_workflow: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
    expect(
      active.find((tool) => tool.name === "caido_set_intercept")?.description,
    ).toMatch(/production SDK may return TOOL_DISABLED/);
  });

  it.each([
    { label: "missing", scopes: [] },
    {
      label: "ambiguous",
      scopes: [
        ...selectedScope([{ action: "allow" as const, host: "api.test" }]),
        {
          ...selectedScope([
            { action: "allow" as const, host: "api.test" },
          ])[0]!,
          id: "scope-2",
        },
      ],
    },
    {
      label: "denied",
      scopes: selectedScope([
        { action: "allow" as const, host: "*.test" },
        { action: "deny" as const, host: "api.test" },
      ]),
    },
  ])(
    "blocks raw send before mutation when selected scope is $label",
    async ({ scopes }) => {
      const sendRawRequest = vi.fn();
      const adapter = createTestAdapter({
        listScopes: async () => scopes,
        sendRawRequest,
      });
      const { client, audit } = await harness("active", adapter);

      const result = await client.callTool({
        name: "caido_send_raw_request",
        arguments: {
          method: "GET",
          url: "HTTPS://API.TEST:443/check",
          headers: [],
        },
      });

      expect(result.structuredContent).toMatchObject({
        ok: false,
        error: { code: "OUT_OF_SCOPE", retryable: false },
        meta: { tool: "caido_send_raw_request" },
      });
      expect(sendRawRequest).not.toHaveBeenCalled();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        tool: "caido_send_raw_request",
        mode: "active",
        success: false,
        errorCode: "OUT_OF_SCOPE",
      });
    },
  );

  it("normalizes raw target before scope evaluation and mutates exactly once", async () => {
    const sendRawRequest = vi.fn(async () => ({
      mutation: "send_raw_request",
      requestIds: ["request-new"],
    }));
    const adapter = createTestAdapter({
      listScopes: async () =>
        selectedScope([
          {
            action: "allow",
            scheme: "https",
            host: "api.test",
            port: 443,
          },
        ]),
      sendRawRequest,
    });
    const { client, audit } = await harness("active", adapter);

    const result = await client.callTool({
      name: "caido_send_raw_request",
      arguments: {
        method: "POST",
        url: "HTTPS://API.TEST.:443/check",
        headers: [["Content-Type", "application/json"]],
        body: '{"probe":true}',
      },
    });

    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        summary: "Sent one bounded raw request.",
        evidence: {
          mutation: "send_raw_request",
          requestIds: ["request-new"],
          target: {
            scheme: "https",
            host: "api.test",
            port: 443,
          },
        },
      },
      meta: {
        tool: "caido_send_raw_request",
        requestIds: ["request-new"],
      },
    });
    expect(sendRawRequest).toHaveBeenCalledTimes(1);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      tool: "caido_send_raw_request",
      success: true,
      requestIds: ["request-new"],
    });
  });

  it("scope-gates Replay from the resolved request target before one mutation", async () => {
    const replayRequest = vi.fn(async () => ({
      mutation: "replay_request",
      requestIds: ["request-original", "request-replayed"],
    }));
    const adapter = createTestAdapter({
      listScopes: async () =>
        selectedScope([
          {
            action: "allow",
            scheme: "https",
            host: "example.test",
            port: 443,
          },
        ]),
      getRequests: async () => [
        {
          id: "request-original",
          method: "GET",
          scheme: "https",
          host: "EXAMPLE.TEST.",
          port: 443,
          path: "/account",
          createdAt: "2026-07-25T00:00:00.000Z",
          request: {
            headers: [],
            body: new Uint8Array(),
            contentType: "text/plain",
          },
        },
      ],
      replayRequest,
    });
    const { client } = await harness("active", adapter);

    const result = await client.callTool({
      name: "caido_replay_request",
      arguments: {
        requestId: "request-original",
        headers: [["X-Test", "one"]],
        body: "probe",
        contentType: "text/plain",
      },
    });

    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        summary: "Replayed one bounded request.",
        evidence: {
          mutation: "replay_request",
          requestIds: ["request-original", "request-replayed"],
          target: {
            scheme: "https",
            host: "example.test",
            port: 443,
          },
        },
      },
    });
    expect(replayRequest).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: "caido_select_project",
      arguments: { projectId: "project-2" },
      override: "selectProject",
      evidence: {
        mutation: "select_project",
        projectId: "project-2",
        requestIds: [],
      },
    },
    {
      name: "caido_create_finding",
      arguments: {
        title: "Confirmed authorization gap",
        description: "Bounded reproduction evidence.",
        requestId: "request-1",
      },
      override: "createFinding",
      evidence: { mutation: "create_finding", requestIds: ["request-1"] },
    },
    {
      name: "caido_update_finding",
      arguments: {
        findingId: "finding-1",
        title: "Updated confirmed finding",
        description: "Updated bounded evidence.",
      },
      override: "updateFinding",
      evidence: { mutation: "update_finding", requestIds: ["request-1"] },
    },
    {
      name: "caido_set_intercept",
      arguments: { enabled: true },
      override: "setIntercept",
      evidence: { mutation: "set_intercept", requestIds: [] },
    },
    {
      name: "caido_run_workflow",
      arguments: { workflowId: "workflow-1", requestId: "request-1" },
      override: "runWorkflow",
      evidence: { mutation: "run_workflow", requestIds: ["request-1"] },
    },
  ] as const)(
    "$name executes one atomic mutation and returns explicit evidence",
    async ({ name, arguments: toolArguments, override, evidence }) => {
      const mutation = vi.fn(async () => evidence);
      const adapter = createTestAdapter({ [override]: mutation });
      const { client, audit } = await harness("active", adapter);

      const result = await client.callTool({
        name,
        arguments: toolArguments,
      });

      expect(result.structuredContent).toMatchObject({
        ok: true,
        data: {
          summary: expect.any(String),
          evidence,
        },
      });
      expect(mutation).toHaveBeenCalledTimes(1);
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ tool: name, success: true });
    },
  );

  it("does not automatically retry an active upstream failure", async () => {
    const sendRawRequest = vi.fn(async () => {
      throw new Error("upstream token=must-not-leak");
    });
    const adapter = createTestAdapter({
      listScopes: async () =>
        selectedScope([{ action: "allow", host: "api.test" }]),
      sendRawRequest,
    });
    const { client, audit } = await harness("active", adapter);

    const result = await client.callTool({
      name: "caido_send_raw_request",
      arguments: {
        method: "GET",
        url: "https://api.test/",
        headers: [],
      },
    });

    expect(sendRawRequest).toHaveBeenCalledTimes(1);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_ERROR", retryable: false },
    });
    expect(JSON.stringify({ result, audit })).not.toContain("must-not-leak");
  });

  it("does not mutate when delayed scope resolution finishes after timeout", async () => {
    const sendRawRequest = vi.fn();
    const adapter = createTestAdapter({
      listScopes: async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
        return selectedScope([{ action: "allow", host: "api.test" }]);
      },
      sendRawRequest,
    });
    const { client } = await harness("active", adapter, 15);

    const result = await client.callTool({
      name: "caido_send_raw_request",
      arguments: { method: "GET", url: "https://api.test/", headers: [] },
    });
    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: { code: "TIMEOUT" },
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(sendRawRequest).not.toHaveBeenCalled();
  });

  it("does not mutate after an external abort during scope resolution", async () => {
    const sendRawRequest = vi.fn();
    let resolveScopes!: () => void;
    const scopesReady = new Promise<void>((resolve) => {
      resolveScopes = resolve;
    });
    const adapter = createTestAdapter({
      listScopes: async () => {
        await scopesReady;
        return selectedScope([{ action: "allow", host: "api.test" }]);
      },
      sendRawRequest,
    });
    const tool = createActiveTools(adapter, {
      bodyLimit: 4096,
      maxBatch: 20,
    }).find((candidate) => candidate.name === "caido_send_raw_request")!;
    const abort = new AbortController();
    const call = tool.handler(
      { method: "GET", url: "https://api.test/", headers: [] },
      abort.signal,
    );
    abort.abort();
    resolveScopes();
    await expect(call).rejects.toBeDefined();
    expect(sendRawRequest).not.toHaveBeenCalled();
  });

  it.each([
    { headers: [["Host", "evil.test"]] },
    { headers: [["X-Test", "safe\r\nInjected: yes"]] },
    { headers: [["Bad Header", "safe"]] },
    { headers: [["X-Test", "safe\u0000value"]] },
  ])(
    "rejects unsafe raw headers before the adapter boundary: $headers",
    async ({ headers }) => {
      const sendRawRequest = vi.fn();
      const adapter = createTestAdapter({
        listScopes: async () =>
          selectedScope([{ action: "allow", host: "api.test" }]),
        sendRawRequest,
      });
      const { client } = await harness("active", adapter);
      const result = await client.callTool({
        name: "caido_send_raw_request",
        arguments: { method: "GET", url: "https://api.test/", headers },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toMatch(/validation|invalid/i);
      expect(sendRawRequest).not.toHaveBeenCalled();
    },
  );
});
