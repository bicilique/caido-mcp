import { homedir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

export type AgentMode = "read-only" | "active" | "admin";

export interface AgentConfig {
  caidoUrl: string;
  mode: AgentMode;
  requireScope: boolean;
  allowSensitiveHeaders: boolean;
  bodyLimit: number;
  maxBatch: number;
  requestTimeoutMs: number;
  auditLog: string;
  tokenCache: string;
}

const AgentModeSchema = z.enum(["read-only", "active", "admin"]);

function parseBoolean(
  name: string,
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  if (value !== "true" && value !== "false") {
    throw new Error(`Invalid ${name}: expected true or false`);
  }
  return value === "true";
}

function parseInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
  maximum: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(
      `Invalid ${name}: expected an integer from 1 to ${maximum}`,
    );
  }
  return parsed;
}

function parseCaidoUrl(value: string | undefined): string {
  const candidate = value ?? "http://127.0.0.1:8080";
  const result = z.url().safeParse(candidate);
  if (!result.success) {
    throw new Error("Invalid CAIDO_URL: expected an absolute HTTP(S) URL");
  }
  const url = new URL(result.data);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Invalid CAIDO_URL: expected an absolute HTTP(S) URL");
  }
  return url.toString().replace(/\/$/, "");
}

function parseMode(value: string | undefined): AgentMode {
  const result = AgentModeSchema.safeParse(value ?? "read-only");
  if (!result.success) {
    throw new Error(
      `Invalid CAIDO_AGENT_MODE: expected read-only, active, or admin`,
    );
  }
  return result.data;
}

export function parseConfig(env: NodeJS.ProcessEnv): AgentConfig {
  const dataDirectory = join(
    homedir(),
    "Library",
    "Application Support",
    "caido-agent-kit",
  );

  return {
    caidoUrl: parseCaidoUrl(env.CAIDO_URL),
    mode: parseMode(env.CAIDO_AGENT_MODE),
    requireScope: parseBoolean(
      "CAIDO_REQUIRE_SCOPE",
      env.CAIDO_REQUIRE_SCOPE,
      true,
    ),
    allowSensitiveHeaders: parseBoolean(
      "CAIDO_ALLOW_SENSITIVE_HEADERS",
      env.CAIDO_ALLOW_SENSITIVE_HEADERS,
      false,
    ),
    bodyLimit: parseInteger(
      "CAIDO_BODY_LIMIT",
      env.CAIDO_BODY_LIMIT,
      4096,
      1_048_576,
    ),
    maxBatch: parseInteger("CAIDO_MAX_BATCH", env.CAIDO_MAX_BATCH, 20, 100),
    requestTimeoutMs: parseInteger(
      "CAIDO_REQUEST_TIMEOUT_MS",
      env.CAIDO_REQUEST_TIMEOUT_MS,
      15_000,
      120_000,
    ),
    auditLog: env.CAIDO_AUDIT_LOG ?? join(dataDirectory, "audit.jsonl"),
    tokenCache: env.CAIDO_TOKEN_CACHE ?? join(dataDirectory, "tokens.json"),
  };
}
