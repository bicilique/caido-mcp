import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import { promptDefinitions } from "../src/prompts/index.js";
import { createServer } from "../src/server.js";

describe("MCP prompts", () => {
  it("discovers four user-controlled safety-framed prompts", async () => {
    const server = createServer({
      mode: "read-only",
      tools: [],
      prompts: promptDefinitions,
    });
    const client = new Client({ name: "contract", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      expect((await client.listPrompts()).prompts.map((item) => item.name).sort())
        .toEqual([
          "caido_compare_replay_results",
          "caido_draft_finding",
          "caido_plan_authorization_test",
          "caido_triage_http_history",
        ]);
      const result = await client.getPrompt({
        name: "caido_triage_http_history",
        arguments: { objective: "Find recent failed logins" },
      });
      const text = JSON.stringify(result);
      expect(text).toMatch(/explicit authorization/i);
      expect(text).toMatch(/untrusted/i);
      expect(text).toMatch(/evidence IDs/i);
      expect(text).not.toMatch(/callTool|tools\/call/);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
