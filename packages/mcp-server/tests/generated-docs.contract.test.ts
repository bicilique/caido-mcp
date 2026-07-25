import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { ToolDefinition } from "../src/registry.js";
import { createActiveTools } from "../src/tools/active/index.js";
import { createReadOnlyTools } from "../src/tools/read/index.js";
import {
  assertDocumentedRegistry,
  renderToolReference,
} from "../../../scripts/generate-tool-reference.js";
import { createTestAdapter } from "./support/adapter.js";

describe("generated tool reference", () => {
  const adapter = createTestAdapter();
  const options = {
    bodyLimit: 4096,
    maxBatch: 20,
  };
  const tools = [
    ...createReadOnlyTools(adapter, options),
    ...createActiveTools(adapter, options),
  ];

  it("matches every tool in the canonical MCP registry", async () => {
    const generated = renderToolReference(tools);
    const committed = await readFile(
      resolve(
        import.meta.dirname,
        "../../../skills/caido-operator/references/tool-selection.md",
      ),
      "utf8",
    );

    expect(generated).toContain("## `caido_health`");
    expect(generated).toContain("## `caido_replay_request`");
    expect(generated.match(/^## `caido_/gm)).toHaveLength(21);
    expect(committed).toBe(generated);
  });

  it("rejects missing registry descriptions, annotations, and schemas", () => {
    const invalid = {
      ...tools[0],
      description: "",
      annotations: undefined,
      inputSchema: undefined,
      outputSchema: undefined,
    } as unknown as ToolDefinition;

    expect(() =>
      assertDocumentedRegistry([invalid], "Call `caido_health`."),
    ).toThrow(/description[^]*annotations[^]*(input|output) schema/is);
  });

  it("rejects Skill references to tools absent from the registry", () => {
    expect(() =>
      assertDocumentedRegistry(tools, "Call `caido_not_registered`."),
    ).toThrow(/Skill references unregistered tool: caido_not_registered/);
  });

  it("uses an exact stable error enum in every output envelope", () => {
    for (const tool of tools) {
      const schema = tool.outputSchema;
      const wrongError = {
        ok: false,
        meta: { tool: tool.name },
        warnings: [],
        error: {
          code: "ANY_ARBITRARY_ERROR",
          message: "bad",
          retryable: false,
        },
      };

      expect(schema.safeParse(wrongError).success, tool.name).toBe(false);
    }
  });

  it("rejects malformed output data that generic records accepted", () => {
    const readTools = createReadOnlyTools(createTestAdapter(), {
      bodyLimit: 4096,
      maxBatch: 20,
    });
    const listRequests = readTools.find(
      (tool) => tool.name === "caido_list_requests",
    )!;
    const health = readTools.find((tool) => tool.name === "caido_health")!;

    expect(
      listRequests.outputSchema.safeParse({
        ok: true,
        data: { arbitrary: "previously accepted" },
        meta: { tool: "caido_list_requests" },
        warnings: [],
      }).success,
    ).toBe(false);
    expect(
      health.outputSchema.safeParse({
        ok: true,
        data: { reachable: "yes", authenticated: true },
        meta: { tool: "caido_health" },
        warnings: [],
      }).success,
    ).toBe(false);

    for (const tool of tools) {
      expect(
        tool.outputSchema.safeParse({
          ok: true,
          data: { arbitrary: "previously accepted" },
          meta: { tool: tool.name },
          warnings: [],
        }).success,
        tool.name,
      ).toBe(false);
    }
  });
});
