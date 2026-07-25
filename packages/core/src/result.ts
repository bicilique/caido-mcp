import type { ToolError, ToolMeta, ToolResult } from "./types.js";

type ResultMeta = Omit<ToolMeta, "tool">;

export function successResult<T>(
  tool: string,
  data: T,
  meta: ResultMeta = {},
  warnings: string[] = [],
): ToolResult<T> {
  return {
    ok: true,
    data,
    meta: { tool, ...meta },
    warnings,
  };
}

export function errorResult<T = never>(
  tool: string,
  error: ToolError,
  meta: ResultMeta = {},
  warnings: string[] = [],
): ToolResult<T> {
  return {
    ok: false,
    meta: { tool, ...meta },
    warnings,
    error,
  };
}
