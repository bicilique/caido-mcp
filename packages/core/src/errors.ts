import type { ToolError, ToolErrorCode } from "./types.js";
import { redactSensitiveText } from "./security/redaction.js";

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
    const sanitizedMessage = redactSensitiveText(error.message);
    return {
      code: error.code,
      message:
        sanitizedMessage === error.message
          ? error.message
          : "The operation failed without exposing sensitive details.",
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
