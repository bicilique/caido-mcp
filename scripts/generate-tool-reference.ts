import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

import type { CaidoAdapter } from "../packages/core/src/caido/adapter.js";
import type { ToolDefinition } from "../packages/mcp-server/src/registry.js";
import { createReadOnlyTools } from "../packages/mcp-server/src/tools/read/index.js";

function jsonSchema(schema: z.ZodType): string {
  return JSON.stringify(z.toJSONSchema(schema), null, 2);
}

export function renderToolReference(
  tools: readonly ToolDefinition[],
): string {
  const sections = [...tools]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(
      (tool) => `## \`${tool.name}\`

**Purpose:** ${tool.description}

**Mode:** ${tool.mode}

**Side effects:** None; this tool is read-only.

**Annotations:** \`${JSON.stringify(tool.annotations)}\`

**Input schema:**

\`\`\`json
${jsonSchema(tool.inputSchema)}
\`\`\`

**Output schema:**

\`\`\`json
${jsonSchema(tool.outputSchema)}
\`\`\`

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** Reads project scope where relevant and sends no target traffic.

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.
`,
    );

  return `# Tool Selection

Generated from the canonical MCP registry. Do not edit manually.

${sections.join("\n")}`;
}

async function main(): Promise<void> {
  const tools = createReadOnlyTools({} as CaidoAdapter, {
    bodyLimit: 4096,
    maxBatch: 20,
  });
  await writeFile(
    resolve("skills/caido-operator/references/tool-selection.md"),
    renderToolReference(tools),
    "utf8",
  );
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
