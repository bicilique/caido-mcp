import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";

import { createServer } from "../src/server.js";
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
    expect(result.structuredContent).toEqual({
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
});
