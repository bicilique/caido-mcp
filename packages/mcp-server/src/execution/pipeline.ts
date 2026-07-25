import {
  AgentError,
  errorResult,
  normalizeError,
  redactStructured,
  type AgentConfig,
  type AuditLogger,
  type RateLimiter,
  type ToolError,
} from "@caido-agent-kit/core";

import type { ToolDefinition } from "../registry.js";

export interface ToolExecutorOptions {
  config: AgentConfig;
  auditLogger: Pick<AuditLogger, "record">;
  rateLimiter: Pick<RateLimiter, "consume">;
}

export type ToolExecutor = (
  tool: ToolDefinition,
  input: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<Record<string, unknown>>;

function abortError(timeout: AbortSignal): AgentError {
  if (timeout.aborted) {
    return new AgentError(
      "TIMEOUT",
      "Caido did not respond before the configured timeout.",
      true,
      "Confirm Caido is running, then retry.",
    );
  }
  return new AgentError(
    "INTERNAL_ERROR",
    "An unexpected internal error occurred.",
    false,
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function metaFrom(result: Record<string, unknown>): Record<string, unknown> {
  return result.meta !== null && typeof result.meta === "object"
    ? asRecord(result.meta)
    : {};
}

function errorFrom(result: Record<string, unknown>): ToolError | undefined {
  return result.error !== null && typeof result.error === "object"
    ? (result.error as ToolError)
    : undefined;
}

function redactResult(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const redacted = asRecord(redactStructured(result));
  return { ...redacted, meta: metaFrom(redacted) };
}

export function createToolExecutor(options: ToolExecutorOptions): ToolExecutor {
  return async (tool, input, signal) => {
    const startedAt = Date.now();
    const timeout = AbortSignal.timeout(options.config.requestTimeoutMs);
    const combinedSignal = AbortSignal.any([signal, timeout]);
    let result: Record<string, unknown>;

    try {
      const parsed = tool.inputSchema.safeParse(input);
      if (!parsed.success) {
        throw new AgentError(
          "INVALID_INPUT",
          "Tool input does not match the registered schema.",
          false,
        );
      }

      try {
        options.rateLimiter.consume(tool.name);
      } catch {
        throw new AgentError(
          "RATE_LIMITED",
          "The tool rate limit has been reached.",
          true,
          "Wait for the rate-limit window, then retry.",
        );
      }
      if (combinedSignal.aborted) {
        throw abortError(timeout);
      }

      const aborted = new Promise<never>((_, reject) => {
        combinedSignal.addEventListener(
          "abort",
          () => reject(abortError(timeout)),
          { once: true },
        );
      });
      result = redactResult(
        await Promise.race([
          tool.handler(parsed.data as Record<string, unknown>, combinedSignal),
          aborted,
        ]),
      );
    } catch (error) {
      result = redactResult(
        asRecord(errorResult(tool.name, normalizeError(error))),
      );
    }

    const meta = metaFrom(result);
    const error = errorFrom(result);
    await options.auditLogger.record({
      timestamp: new Date().toISOString(),
      tool: tool.name,
      mode: options.config.mode,
      ...(typeof meta.projectId === "string"
        ? { projectId: meta.projectId }
        : {}),
      ...(Array.isArray(meta.requestIds) &&
      meta.requestIds.every((id) => typeof id === "string")
        ? { requestIds: meta.requestIds }
        : {}),
      success: result.ok === true,
      ...(error === undefined ? {} : { errorCode: error.code }),
      durationMs: Date.now() - startedAt,
      truncated: meta.truncated === true,
    });
    return result;
  };
}
