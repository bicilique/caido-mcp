import { describe, expect, it } from "vitest";

import { parseConfig } from "../src/config.js";

describe("parseConfig", () => {
  it("uses secure local defaults", () => {
    expect(parseConfig({})).toMatchObject({
      caidoUrl: "http://127.0.0.1:8080",
      mode: "read-only",
      requireScope: true,
      allowSensitiveHeaders: false,
      bodyLimit: 4096,
      maxBatch: 20,
      requestTimeoutMs: 15_000,
    });
  });

  it("rejects an unknown agent mode", () => {
    expect(() => parseConfig({ CAIDO_AGENT_MODE: "dangerous" })).toThrow(
      /CAIDO_AGENT_MODE/,
    );
  });

  it("parses explicit supported configuration", () => {
    expect(
      parseConfig({
        CAIDO_URL: "http://localhost:9090",
        CAIDO_AGENT_MODE: "active",
        CAIDO_REQUIRE_SCOPE: "false",
        CAIDO_ALLOW_SENSITIVE_HEADERS: "true",
        CAIDO_BODY_LIMIT: "2048",
        CAIDO_MAX_BATCH: "10",
        CAIDO_REQUEST_TIMEOUT_MS: "5000",
        CAIDO_AUDIT_LOG: "/tmp/caido-audit.jsonl",
        CAIDO_TOKEN_CACHE: "/tmp/caido-tokens.json",
      }),
    ).toEqual({
      caidoUrl: "http://localhost:9090",
      mode: "active",
      requireScope: false,
      allowSensitiveHeaders: true,
      bodyLimit: 2048,
      maxBatch: 10,
      requestTimeoutMs: 5000,
      auditLog: "/tmp/caido-audit.jsonl",
      tokenCache: "/tmp/caido-tokens.json",
    });
  });

  it("rejects a non-HTTP Caido URL", () => {
    expect(() => parseConfig({ CAIDO_URL: "file:///tmp/caido" })).toThrow(
      /CAIDO_URL/,
    );
  });

  it("rejects an ambiguous boolean value", () => {
    expect(() => parseConfig({ CAIDO_REQUIRE_SCOPE: "yes" })).toThrow(
      /CAIDO_REQUIRE_SCOPE/,
    );
  });

  it.each([
    ["CAIDO_BODY_LIMIT", "0"],
    ["CAIDO_BODY_LIMIT", "1048577"],
    ["CAIDO_MAX_BATCH", "101"],
    ["CAIDO_REQUEST_TIMEOUT_MS", "120001"],
    ["CAIDO_MAX_BATCH", "1.5"],
  ])("rejects unsafe numeric bound %s=%s", (name, value) => {
    expect(() => parseConfig({ [name]: value })).toThrow(new RegExp(name));
  });
});
