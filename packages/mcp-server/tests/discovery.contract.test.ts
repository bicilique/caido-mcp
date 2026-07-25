import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createServer } from "../src/server.js";
import type { ToolDefinition } from "../src/registry.js";

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

async function connectedPair(tools: readonly ToolDefinition[]) {
  const server = createServer({ mode: "read-only", tools });
  const client = new Client({ name: "contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  closeCallbacks.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}

describe("MCP discovery", () => {
  it("initializes and exposes an empty canonical registry", async () => {
    const client = await connectedPair([]);

    expect(await client.listTools()).toEqual({ tools: [] });
  });

  it("discovers and invokes a schema-complete annotated tool", async () => {
    const tool: ToolDefinition = {
      name: "caido_health",
      description:
        "Checks local Caido reachability and authentication without returning secrets.",
      mode: "read-only",
      inputSchema: z.strictObject({}),
      outputSchema: z.strictObject({
        ok: z.boolean(),
        data: z.strictObject({ reachable: z.boolean() }),
        meta: z.strictObject({ tool: z.literal("caido_health") }),
        warnings: z.array(z.string()),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      handler: async () => ({
        ok: true,
        data: { reachable: false },
        meta: { tool: "caido_health" },
        warnings: [],
      }),
    };
    const client = await connectedPair([tool]);

    const listed = await client.listTools();
    expect(listed.tools).toHaveLength(1);
    expect(listed.tools[0]).toMatchObject({
      name: "caido_health",
      description: tool.description,
      annotations: tool.annotations,
    });
    expect(listed.tools[0]?.inputSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
    });
    expect(listed.tools[0]?.outputSchema).toMatchObject({ type: "object" });

    const result = await client.callTool({
      name: "caido_health",
      arguments: {},
    });
    expect(result.structuredContent).toEqual({
      ok: true,
      data: { reachable: false },
      meta: { tool: "caido_health" },
      warnings: [],
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify(result.structuredContent),
      },
    ]);
  });
});
