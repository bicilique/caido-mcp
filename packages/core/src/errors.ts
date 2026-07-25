import {
  TOOL_ERROR_CODES,
  type ToolError,
  type ToolErrorCode,
} from "./types.js";
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

function isAgentError(error: unknown): error is AgentError {
  if (error instanceof AgentError) return true;
  if (!(error instanceof Error) || error.name !== "AgentError") return false;
  const candidate = error as Partial<AgentError>;
  return (
    typeof candidate.code === "string" &&
    TOOL_ERROR_CODES.includes(candidate.code as ToolErrorCode) &&
    typeof candidate.retryable === "boolean" &&
    (candidate.remediation === undefined ||
      typeof candidate.remediation === "string")
  );
}

export function normalizeError(error: unknown): ToolError {
  if (isAgentError(error)) {
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
