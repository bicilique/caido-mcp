import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createReadOnlyTools } from "../src/tools/read/index.js";
import { renderToolReference } from "../../../scripts/generate-tool-reference.js";
import { createTestAdapter } from "./support/adapter.js";

describe("generated tool reference", () => {
  it("matches the canonical MCP registry", async () => {
    const tools = createReadOnlyTools(createTestAdapter(), {
      bodyLimit: 4096,
      maxBatch: 20,
    });
    const generated = renderToolReference(tools);
    const committed = await readFile(
      resolve(
        import.meta.dirname,
        "../../../skills/caido-operator/references/tool-selection.md",
      ),
      "utf8",
    );

    expect(generated).toContain("## `caido_health`");
    expect(generated.match(/^## `caido_/gm)).toHaveLength(14);
    expect(committed).toBe(generated);
  });
});
