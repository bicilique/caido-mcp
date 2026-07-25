import type { ToolError, ToolErrorCode } from "./types.js";

export class AgentError extends Error {
  readonly code: ToolErrorCode;
  readonly retryable: boolean;
  readonly remediation: string | undefined;

  constructor(
    code: ToolErrorCode,
    message: string,
    retryable: boolean,
    remediation?: string,
  ) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.retryable = retryable;
    this.remediation = remediation;
  }
}

export function normalizeError(error: unknown): ToolError {
  if (error instanceof AgentError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.remediation === undefined
        ? {}
        : { remediation: error.remediation }),
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected internal error occurred.",
    retryable: false,
  };
}
