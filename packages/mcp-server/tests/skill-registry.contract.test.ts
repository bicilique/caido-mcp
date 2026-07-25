import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertDocumentedRegistry,
  readSkillMarkdownTree,
} from "../../../scripts/generate-tool-reference.js";
import { createReadOnlyTools } from "../src/tools/read/index.js";
import { createTestAdapter } from "./support/adapter.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Skill registry reference scan", () => {
  it("recursively scans manual Markdown references but excludes generated output", async () => {
    const root = await mkdtemp(join(tmpdir(), "caido-skill-registry-"));
    temporaryDirectories.push(root);
    await mkdir(join(root, "references", "nested"), { recursive: true });
    await mkdir(join(root, "assets", "nested"), { recursive: true });
    await writeFile(join(root, "SKILL.md"), "Use `caido_health`.", "utf8");
    await writeFile(
      join(root, "references", "tool-selection.md"),
      "Generated `caido_generated_only_unknown`.",
      "utf8",
    );
    await writeFile(
      join(root, "references", "nested", "manual.md"),
      "Manual reference uses `caido_health`.",
      "utf8",
    );

    const tools = createReadOnlyTools(createTestAdapter(), {
      bodyLimit: 4096,
      maxBatch: 20,
    });
    const initialDocuments = await readSkillMarkdownTree(root);
    expect(initialDocuments).not.toContain("caido_generated_only_unknown");
    expect(() =>
      assertDocumentedRegistry(tools, initialDocuments),
    ).not.toThrow();

    await writeFile(
      join(root, "assets", "nested", "tool-selection.md"),
      "Manual nested asset uses `caido_nested_asset_unknown`.",
      "utf8",
    );
    const nestedAssetDocuments = await readSkillMarkdownTree(root);
    expect(nestedAssetDocuments).toContain("caido_nested_asset_unknown");
    expect(() =>
      assertDocumentedRegistry(tools, nestedAssetDocuments),
    ).toThrow(/caido_nested_asset_unknown/);

    await writeFile(
      join(root, "references", "nested", "manual.md"),
      "Manual reference uses `caido_nested_unknown`.",
      "utf8",
    );

    const changedDocuments = await readSkillMarkdownTree(root);
    expect(() =>
      assertDocumentedRegistry(tools, changedDocuments),
    ).toThrow(/caido_nested_unknown/);
  });
});
