import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import { AuditLogger } from "../../core/src/security/audit-log.js";
import { AgentError } from "../../core/src/errors.js";
import { RateLimiter } from "../../core/src/security/rate-limit.js";
import { z } from "zod";
import { afterEach, describe, expect, it } from "vitest";

import { createToolExecutor } from "../src/execution/pipeline.js";
import type { ToolDefinition } from "../src/registry.js";
import { readOnlyAnnotations, resultSchema } from "../src/tools/shared.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function executorFor(options: { timeoutMs?: number; limit?: number } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "caido-security-pipeline-"));
  directories.push(directory);
  const auditPath = join(directory, "audit.jsonl");
  return {
    execute: createToolExecutor({
    config: {
      caidoUrl: "http://127.0.0.1:8080",
      mode: "read-only",
      requireScope: true,
      allowSensitiveHeaders: false,
      bodyLimit: 4096,
      maxBatch: 20,
      requestTimeoutMs: options.timeoutMs ?? 100,
      auditLog: auditPath,
      tokenCache: join(directory, "tokens.json"),
    },
    auditLogger: new AuditLogger({
      path: auditPath,
      maxBytes: 4096,
      maxFiles: 2,
    }),
    rateLimiter: new RateLimiter({ limit: options.limit ?? 10, windowMs: 1_000 }),
    }),
    auditPath,
  };
}

function tool(
  handler: ToolDefinition["handler"],
  name: `caido_${string}` = "caido_security_test",
): ToolDefinition {
  return {
    name,
    description: "Security pipeline test tool.",
    mode: "read-only",
    inputSchema: z.strictObject({}),
    outputSchema: resultSchema(name, z.unknown()),
    annotations: readOnlyAnnotations,
    handler,
  };
}

describe("security execution pipeline", () => {
  it("returns a deterministic secret-free envelope for upstream failures", async () => {
    const { execute } = await executorFor();

    const result = await execute(
      tool(async () => {
        throw new Error("Authorization: Bearer upstream-secret");
      }),
      {},
      new AbortController().signal,
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected internal error occurred.",
        retryable: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("upstream-secret");
  });

  it("sanitizes secret-bearing AgentError messages in output and audit events", async () => {
    const { execute, auditPath } = await executorFor();

    const result = await execute(
      tool(async () => {
        throw new AgentError(
          "UPSTREAM_ERROR",
          "Caido rejected credential token=agent-error-secret.",
          true,
        );
      }),
      {},
      new AbortController().signal,
    );
    const audit = await readFile(auditPath, "utf8");

    expect(result).toMatchObject({ ok: false, error: { code: "UPSTREAM_ERROR" } });
    expect(JSON.stringify(result)).not.toContain("agent-error-secret");
    expect(audit).not.toContain("agent-error-secret");
  });

  it("aborts an in-flight handler when the caller cancels", async () => {
    const { execute } = await executorFor({ timeoutMs: 1_000 });
    const controller = new AbortController();
    let aborted = false;
    const pending = execute(
      tool(
        (_input, signal) =>
          new Promise((resolve) => {
            signal.addEventListener("abort", () => {
              aborted = true;
              resolve({ ok: true, meta: { tool: "caido_security_test" }, warnings: [] });
            });
          }),
      ),
      {},
      controller.signal,
    );

    controller.abort();
    await pending;

    expect(aborted).toBe(true);
  });

  it("returns TIMEOUT when a handler exceeds the configured deadline", async () => {
    const { execute } = await executorFor({ timeoutMs: 1 });

    const result = await execute(
      tool(() => new Promise(() => undefined)),
      {},
      new AbortController().signal,
    );

    expect(result).toMatchObject({ ok: false, error: { code: "TIMEOUT" } });
  });

  it("returns RATE_LIMITED after the configured tool budget is consumed", async () => {
    const { execute } = await executorFor({ limit: 1 });
    const definition = tool(async () => ({ ok: true, meta: { tool: "caido_security_test" }, warnings: [] }));

    await execute(definition, {}, new AbortController().signal);
    const result = await execute(definition, {}, new AbortController().signal);

    expect(result).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
  });

  it("writes one secret-free audit event for every execution", async () => {
    const { execute, auditPath } = await executorFor();
    const definition = tool(async () => ({
      ok: true,
      data: { accessToken: "result-secret" },
      meta: { tool: "caido_security_test", requestIds: ["evidence-1"], truncated: true },
      warnings: [],
    }));

    await execute(definition, {}, new AbortController().signal);
    const audit = await readFile(auditPath, "utf8");

    expect(audit.trim().split("\n")).toHaveLength(1);
    expect(audit).toContain("evidence-1");
    expect(audit).toContain('"truncated":true');
    expect(audit).not.toContain("result-secret");
  });
});
