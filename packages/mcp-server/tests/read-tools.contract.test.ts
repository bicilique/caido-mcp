import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";

import { createServer } from "../src/server.js";
import { createToolExecutor } from "../src/execution/pipeline.js";
import { createReadOnlyTools } from "../src/tools/read/index.js";
import { createTestAdapter } from "./support/adapter.js";

const expectedNames = [
  "caido_diff_responses",
  "caido_get_current_project",
  "caido_get_finding",
  "caido_get_request",
  "caido_health",
  "caido_is_in_scope",
  "caido_list_filters",
  "caido_list_findings",
  "caido_list_projects",
  "caido_list_replay_sessions",
  "caido_list_requests",
  "caido_list_scopes",
  "caido_list_sitemap",
  "caido_list_workflows",
];

const closers: Array<() => Promise<void>> = [];
afterEach(async () => Promise.all(closers.splice(0).map((close) => close())));

async function clientFor(adapter = createTestAdapter()) {
  const server = createServer({
    mode: "read-only",
    executor: createToolExecutor({
      config: {
        caidoUrl: "http://127.0.0.1:8080",
        mode: "read-only",
        requireScope: true,
        allowSensitiveHeaders: false,
        bodyLimit: 4096,
        maxBatch: 20,
        requestTimeoutMs: 1_000,
        auditLog: "/unused/audit.jsonl",
        tokenCache: "/unused/tokens.json",
      },
      auditLogger: { record: async () => undefined },
      rateLimiter: { consume: () => undefined },
    }),
    tools: createReadOnlyTools(adapter, {
      bodyLimit: 4096,
      maxBatch: 20,
    }),
  });
  const client = new Client({ name: "contract", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}

describe("read-only tool catalog", () => {
  it("registers exactly the bounded read-only catalog with complete metadata", async () => {
    const client = await clientFor();
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual(expectedNames);
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
      expect(tool.outputSchema).toMatchObject({ type: "object" });
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    }
  });

  it("returns health as a stable secret-free envelope", async () => {
    const client = await clientFor(
      createTestAdapter({
        health: async () => ({
          reachable: true,
          authenticated: true,
          version: "0.57.1",
        }),
      }),
    );

    const result = await client.callTool({ name: "caido_health", arguments: {} });
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        reachable: true,
        authenticated: true,
        version: "0.57.1",
      },
      meta: { tool: "caido_health" },
      warnings: [],
    });
    expect(JSON.stringify(result)).not.toMatch(/token|authorization|cookie/i);
  });

  it("redacts JSON credentials and query credentials in request evidence", async () => {
    const client = await clientFor(
      createTestAdapter({
        getRequests: async () => [
          {
            id: "request-1",
            method: "POST",
            host: "example.test",
            path: "/api/profile?access_token=query-secret&view=public",
            scheme: "https",
            port: 443,
            requestLength: 80,
            responseLength: 0,
            createdAt: "2026-07-25T00:00:00.000Z",
            request: {
              headers: [["content-type", "application/json"]],
              contentType: "application/json",
              body: new TextEncoder().encode(
                JSON.stringify({ profile: { accessToken: "json-secret" } }),
              ),
            },
          },
        ],
      }),
    );

    const result = await client.callTool({
      name: "caido_get_request",
      arguments: { requestIds: ["request-1"] },
    });

    const serialized = JSON.stringify(result.structuredContent);
    expect(serialized).not.toContain("json-secret");
    expect(serialized).not.toContain("query-secret");
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).toContain("view=public");
  });

  it("redacts header-like credentials from non-JSON request evidence", async () => {
    const client = await clientFor(
      createTestAdapter({
        getRequests: async () => [
          {
            id: "request-2",
            method: "GET",
            host: "example.test",
            path: "/status",
            scheme: "https",
            port: 443,
            requestLength: 40,
            responseLength: 0,
            createdAt: "2026-07-25T00:00:00.000Z",
            request: {
              headers: [],
              contentType: "text/plain",
              body: new TextEncoder().encode("Authorization: Bearer text-secret"),
            },
          },
        ],
      }),
    );

    const result = await client.callTool({
      name: "caido_get_request",
      arguments: { requestIds: ["request-2"] },
    });

    expect(JSON.stringify(result.structuredContent)).not.toContain("text-secret");
  });
});
