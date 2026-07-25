import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
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

export function toolOutputJsonSchema(schema: z.ZodType): JsonSchemaObject {
  const generated = z.toJSONSchema(schema) as JsonSchemaObject;
  if (
    generated.type !== "object" ||
    generated.properties?.data === undefined ||
    generated.properties.error === undefined ||
    generated.properties.meta === undefined
  ) {
    throw new Error("Tool output schema is not a complete result envelope.");
  }
  const { $schema, $defs, properties, required: baseRequired = [], ...base } =
    generated;
  const successProperties = structuredClone(properties);
  successProperties.ok = { type: "boolean", const: true };
  delete successProperties.error;
  const errorProperties = structuredClone(properties);
  errorProperties.ok = { type: "boolean", const: false };
  delete errorProperties.data;

  return {
    ...($schema === undefined ? {} : { $schema }),
    ...($defs === undefined ? {} : { $defs }),
    oneOf: [
      {
        ...base,
        type: "object",
        properties: successProperties,
        required: [...new Set([...baseRequired, "data"])],
        additionalProperties: false,
      },
      {
        ...base,
        type: "object",
        properties: errorProperties,
        required: [...new Set([...baseRequired, "error"])],
        additionalProperties: false,
      },
    ],
  };
}

export async function readSkillMarkdownTree(root: string): Promise<string> {
  const documents: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        basename(path) !== "tool-selection.md"
      ) {
        documents.push(await readFile(path, "utf8"));
      }
    }
  };
  await walk(root);
  return documents.join("\n");
}

export function assertDocumentedRegistry(
  tools: readonly ToolDefinition[],
  skillDocument: string,
): void {
  const errors: string[] = [];
  const names = new Set<string>();
  const annotationKeys = [
    "destructiveHint",
    "idempotentHint",
    "openWorldHint",
    "readOnlyHint",
  ];

  for (const tool of tools) {
    if (names.has(tool.name)) {
      errors.push(`duplicate registered tool: ${tool.name}`);
    }
    names.add(tool.name);
    if (tool.description.trim().length === 0) {
      errors.push(`${tool.name} has no description`);
    }
    const actualAnnotationKeys =
      tool.annotations === undefined
        ? []
        : Object.keys(tool.annotations).sort((left, right) =>
            left.localeCompare(right),
          );
    if (
      actualAnnotationKeys.length !== annotationKeys.length ||
      actualAnnotationKeys.some(
        (key, index) => key !== annotationKeys[index],
      ) ||
      Object.values(tool.annotations ?? {}).some(
        (value) => typeof value !== "boolean",
      )
    ) {
      errors.push(
        `${tool.name} must define exactly four annotation keys with boolean values`,
      );
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
        if (label === "output") {
          toolOutputJsonSchema(schema);
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

**Output schema:** This complete discriminated schema accepts exactly one success or error state.

\`\`\`json
${JSON.stringify(toolOutputJsonSchema(tool.outputSchema), null, 2)}
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
  const skillRoot = resolve("skills/caido-operator");
  const skillDocument = await readSkillMarkdownTree(skillRoot);
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
