export const TOOL_ERROR_CODES = [
  "AUTH_REQUIRED",
  "AUTH_FAILED",
  "CAIDO_UNREACHABLE",
  "INVALID_INPUT",
  "INVALID_HTTPQL",
  "NOT_FOUND",
  "OUT_OF_SCOPE",
  "TOOL_DISABLED",
  "AUDIT_UNAVAILABLE",
  "TIMEOUT",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;

export type ToolErrorCode = (typeof TOOL_ERROR_CODES)[number];

export interface ToolError {
  code: ToolErrorCode;
  message: string;
  retryable: boolean;
  remediation?: string;
}

export interface ToolMeta {
  tool: string;
  projectId?: string;
  requestIds?: string[];
  truncated?: boolean;
  offset?: number;
  limit?: number;
  untrusted?: boolean;
  source?: string;
  durationMs?: number;
}

export interface ToolResult<T> {
  ok: boolean;
  data?: T;
  meta: ToolMeta;
  warnings: string[];
  error?: ToolError;
}
