import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createMockCaidoServer } from "./mock-caido-server.js";
import { createIntegrationRuntime } from "./runtime-harness.js";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => Promise.all(cleanup.splice(0).map((close) => close())));

describe("mock Caido read-only integration", () => {
  it("exercises runtime through the real SDK adapter for health, pagination, and redacted detail", async () => {
    const mock = await createMockCaidoServer();
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido integration "));
    const harness = await createIntegrationRuntime(mock.url, directory, "read-only");
    cleanup.push(harness.close);

    const health = await harness.client.callTool({
      name: "caido_health",
      arguments: {},
    });
    expect(health.structuredContent).toMatchObject({
      ok: true,
      data: {
        reachable: true,
        authenticated: true,
        version: "0.57.1",
      },
    });

    const first = await harness.client.callTool({
      name: "caido_list_requests",
      arguments: { limit: 1, direction: "descending" },
    });
    expect(first.structuredContent).toMatchObject({
      ok: true,
      data: {
        items: [{ id: "request-text", host: "127.0.0.1" }],
        nextCursor: "cursor-request-text",
      },
    });

    const detail = await harness.client.callTool({
      name: "caido_get_request",
      arguments: { requestIds: ["request-text", "request-binary"] },
    });
    const serialized = JSON.stringify(detail.structuredContent);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("integration-secret");
    expect(serialized).not.toContain("binary-secret");
    expect(detail.structuredContent).toMatchObject({
      ok: true,
      meta: { untrusted: true, source: "caido_http_traffic" },
    });

    await harness.close();
    const audit = await readFile(join(directory, "audit.jsonl"), "utf8");
    expect(audit).toContain('"tool":"caido_get_request"');
    expect(audit).not.toContain("integration-secret");
  });

  it("sanitizes invalid HTTPQL, upstream failure, and malformed SDK data without hanging", async () => {
    const mock = await createMockCaidoServer();
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido integration errors "));
    const harness = await createIntegrationRuntime(mock.url, directory, "read-only");
    cleanup.push(harness.close);

    for (const httpql of ["INVALID_HTTPQL", "UPSTREAM_ERROR", "MALFORMED_DATA"]) {
      const result = await harness.client.callTool({
        name: "caido_list_requests",
        arguments: { httpql, limit: 2, direction: "descending" },
      });
      expect(result.structuredContent).toMatchObject({ ok: false });
      expect(JSON.stringify(result)).not.toMatch(/integration-secret|stack|graphql/i);
    }
  });

  it("represents HTTP auth failure as a deterministic sanitized tool error", async () => {
    const mock = await createMockCaidoServer({ requiredToken: "other-token" });
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido integration auth "));
    const harness = await createIntegrationRuntime(mock.url, directory, "read-only");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_list_projects",
      arguments: { limit: 10 },
    });
    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: { retryable: false },
    });
    expect(JSON.stringify(result)).not.toContain("integration-token");
  });

  it("refreshes one stale SDK token at the real GraphQL authentication boundary", async () => {
    const mock = await createMockCaidoServer({
      requiredToken: "fresh-token",
      refreshToken: "integration-refresh",
    });
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido integration refresh "));
    const harness = await createIntegrationRuntime(
      mock.url,
      directory,
      "read-only",
      {
        accessToken: "stale-token",
        refreshToken: "integration-refresh",
      },
    );
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_list_projects",
      arguments: { limit: 10 },
    });
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: { items: expect.any(Array) },
    });
    expect(mock.operations("RefreshAuthenticationToken")).toHaveLength(1);
    expect(JSON.stringify(result)).not.toMatch(/stale-token|fresh-token/);
  });
});
