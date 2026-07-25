import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

export type RegistrationMode = "read-only" | "active" | "admin";

export interface ToolDefinition {
  name: `caido_${string}`;
  description: string;
  mode: "read-only" | "active";
  inputSchema: z.ZodObject;
  outputSchema: z.ZodObject;
  annotations: Required<
    Pick<
      ToolAnnotations,
      "readOnlyHint" | "destructiveHint" | "idempotentHint" | "openWorldHint"
    >
  >;
  handler(
    input: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>>;
}

export function toolsForMode(
  tools: readonly ToolDefinition[],
  mode: RegistrationMode,
): readonly ToolDefinition[] {
  if (mode === "active") {
    return tools;
  }
  return tools.filter((tool) => tool.mode === "read-only");
}
