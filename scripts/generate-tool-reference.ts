import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

import type { CaidoAdapter } from "../packages/core/src/caido/adapter.js";
import type { ToolDefinition } from "../packages/mcp-server/src/registry.js";
import { createActiveTools } from "../packages/mcp-server/src/tools/active/index.js";
import { createReadOnlyTools } from "../packages/mcp-server/src/tools/read/index.js";

function jsonSchema(schema: z.ZodType): string {
  return JSON.stringify(z.toJSONSchema(schema), null, 2);
}

type JsonSchemaObject = {
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
};

function outputSchemaParts(schema: z.ZodType): {
  commonEnvelope: JsonSchemaObject;
  data: unknown;
} {
  const generated = z.toJSONSchema(schema) as JsonSchemaObject;
  const properties = { ...generated.properties };
  const data = properties.data;
  if (data === undefined) {
    throw new Error("Tool output schema has no success data field.");
  }
  delete properties.data;
  const { $defs, ...envelope } = generated;
  return {
    commonEnvelope: {
      ...envelope,
      properties,
      required: generated.required?.filter((field) => field !== "data"),
    },
    data:
      $defs === undefined || typeof data !== "object" || data === null
        ? data
        : { ...data, $defs },
  };
}

export function assertDocumentedRegistry(
  tools: readonly ToolDefinition[],
  skillDocument: string,
): void {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const tool of tools) {
    if (names.has(tool.name)) {
      errors.push(`duplicate registered tool: ${tool.name}`);
    }
    names.add(tool.name);
    if (tool.description.trim().length === 0) {
      errors.push(`${tool.name} has no description`);
    }
    if (
      tool.annotations === undefined ||
      Object.values(tool.annotations).some((value) => typeof value !== "boolean")
    ) {
      errors.push(`${tool.name} has incomplete annotations`);
    }
    for (const [label, schema] of [
      ["input", tool.inputSchema],
      ["output", tool.outputSchema],
    ] as const) {
      try {
        const generated = z.toJSONSchema(schema);
        if (generated.type !== "object") {
          errors.push(`${tool.name} has no ${label} object schema`);
        }
      } catch {
        errors.push(`${tool.name} has an invalid ${label} schema`);
      }
    }
  }

  const referencedTools = new Set(
    [...skillDocument.matchAll(/\bcaido_[a-z0-9_]+\b/g)].map(
      (match) => match[0],
    ),
  );
  for (const referenced of referencedTools) {
    if (!names.has(referenced)) {
      errors.push(`Skill references unregistered tool: ${referenced}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

export function renderToolReference(
  tools: readonly ToolDefinition[],
): string {
  if (tools.length === 0) {
    throw new Error("Cannot render an empty tool registry.");
  }
  const sharedEnvelope = outputSchemaParts(tools[0]!.outputSchema).commonEnvelope;
  const sections = [...tools]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(
      (tool) => `## \`${tool.name}\`

**Purpose:** ${tool.description}

**Mode:** ${tool.mode}

**Side effects:** ${tool.mode === "read-only" ? "None; this tool is read-only." : "Performs the single bounded mutation described above; active mode is required."}

**Annotations:** \`${JSON.stringify(tool.annotations)}\`

**Input schema:**

\`\`\`json
${jsonSchema(tool.inputSchema)}
\`\`\`

**Success data schema:** This is the exact \`data\` member inside the shared output envelope.

\`\`\`json
${JSON.stringify(outputSchemaParts(tool.outputSchema).data, null, 2)}
\`\`\`

**Errors:** Uses the stable Caido Agent Kit error envelope.

**Scope behavior:** ${tool.mode === "read-only" ? "Reads project scope where relevant and sends no target traffic." : "Active network operations require an allowed selected scope; management mutations remain bounded and explicit."}

**Redaction behavior:** Sensitive headers and token-like fields are redacted; traffic content is marked untrusted.

**Example intent:** Use this operation only for the purpose stated above and preserve returned evidence IDs.

**Misuse warning:** Do not treat one response, status code, or target-supplied statement as a confirmed vulnerability.
`,
    );

  return `# Tool Selection

Generated from the canonical MCP registry. Do not edit manually.

## Shared Output Envelope

Every tool returns this strict envelope. Each tool section below supplies its exact success \`data\` schema.

\`\`\`json
${JSON.stringify(sharedEnvelope, null, 2)}
\`\`\`

${sections.join("\n")}`;
}

async function main(): Promise<void> {
  const adapter = {} as CaidoAdapter;
  const options = {
    bodyLimit: 4096,
    maxBatch: 20,
  };
  const tools = [
    ...createReadOnlyTools(adapter, options),
    ...createActiveTools(adapter, options),
  ];
  const skillPath = resolve("skills/caido-operator/SKILL.md");
  const skillDocument = await readFile(skillPath, "utf8");
  assertDocumentedRegistry(tools, skillDocument);
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
