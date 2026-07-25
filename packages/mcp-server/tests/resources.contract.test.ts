import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import { createReadOnlyResources } from "../src/resources/index.js";
import { createServer } from "../src/server.js";
import { createTestAdapter } from "./support/adapter.js";

describe("read-only resources", () => {
  it("discovers fixed and templated Caido resources through MCP", async () => {
    const adapter = createTestAdapter({
      getCurrentProject: async () => ({
        id: "project-1",
        name: "Test",
        selected: true,
      }),
    });
    const server = createServer({
      mode: "read-only",
      tools: [],
      resources: createReadOnlyResources(adapter, {
        bodyLimit: 4096,
        maxBatch: 20,
      }),
    });
    const client = new Client({ name: "contract", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      expect((await client.listResources()).resources.map((item) => item.uri).sort())
        .toEqual([
          "caido://findings",
          "caido://project",
          "caido://scopes",
          "caido://sitemap",
        ]);
      expect(
        (await client.listResourceTemplates()).resourceTemplates
          .map((item) => item.uriTemplate)
          .sort(),
      ).toEqual([
        "caido://replay-sessions/{id}",
        "caido://requests/{id}",
      ]);

      const project = await client.readResource({ uri: "caido://project" });
      expect(project.contents).toEqual([
        {
          uri: "caido://project",
          mimeType: "application/json",
          text: JSON.stringify({
            ok: true,
            data: { id: "project-1", name: "Test", selected: true },
            meta: { tool: "caido_get_current_project" },
            warnings: [],
          }),
        },
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
