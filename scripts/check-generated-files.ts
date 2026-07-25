import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { CaidoAdapter } from "../packages/core/src/caido/adapter.js";
import { createActiveTools } from "../packages/mcp-server/src/tools/active/index.js";
import { createReadOnlyTools } from "../packages/mcp-server/src/tools/read/index.js";
import {
  assertDocumentedRegistry,
  readSkillMarkdownTree,
  renderToolReference,
} from "./generate-tool-reference.js";

const skillRoot = resolve("skills/caido-operator");
const referencePath = resolve(skillRoot, "references/tool-selection.md");
const adapter = {} as CaidoAdapter;
const tools = [
  ...createReadOnlyTools(adapter, { bodyLimit: 4096, maxBatch: 20 }),
  ...createActiveTools(adapter, { bodyLimit: 4096, maxBatch: 20 }),
];
const skillDocument = await readSkillMarkdownTree(skillRoot);
assertDocumentedRegistry(tools, skillDocument);

const expected = renderToolReference(tools);
const actual = await readFile(referencePath, "utf8");
if (actual !== expected) {
  console.error(
    "Generated tool reference is stale. Run: corepack pnpm generate:tools",
  );
  process.exitCode = 1;
} else {
  console.log("Generated files are current.");
}
