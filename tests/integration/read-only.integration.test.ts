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
    const second = await harness.client.callTool({
      name: "caido_list_requests",
      arguments: {
        cursor: "cursor-request-text",
        limit: 1,
        direction: "descending",
      },
    });
    expect(second.structuredContent).toMatchObject({
      ok: true,
      data: {
        items: [{ id: "request-binary", host: "127.0.0.1" }],
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
    expect(serialized).not.toContain("binary-response-secret");
    expect(detail.structuredContent).toMatchObject({
      ok: true,
      data: [
        {
          id: "request-text",
          request: {
            body: {
              byteLength: expect.any(Number),
              limit: 4096,
              truncated: true,
              text: expect.any(String),
            },
          },
          response: {
            body: {
              byteLength: expect.any(Number),
              contentType: "application/json",
              limit: 4096,
              truncated: true,
              text: expect.any(String),
            },
          },
        },
        {
          id: "request-binary",
          request: {
            body: {
              byteLength: expect.any(Number),
              contentType: "application/octet-stream",
              truncated: false,
            },
          },
          response: {
            body: {
              byteLength: expect.any(Number),
              contentType: "application/octet-stream",
              truncated: true,
            },
          },
        },
      ],
      meta: { untrusted: true, source: "caido_http_traffic" },
    });
    const messages = (
      detail.structuredContent as {
        data: Array<{
          request: { body: { byteLength: number; text?: string } };
          response: { body: { byteLength: number; text?: string } };
        }>;
      }
    ).data;
    expect(messages[0]!.request.body.byteLength).toBeGreaterThan(4096);
    expect(messages[0]!.request.body.text!.length).toBeLessThanOrEqual(4096);
    expect(messages[1]!.request.body).not.toHaveProperty("text");
    expect(messages[0]!.response.body.byteLength).toBeGreaterThan(4096);
    expect(messages[0]!.response.body.text!.length).toBeLessThanOrEqual(4096);
    expect(messages[1]!.response.body.byteLength).toBeGreaterThan(4096);
    expect(messages[1]!.response.body).not.toHaveProperty("text");

    await harness.close();
    const audit = await readFile(join(directory, "audit.jsonl"), "utf8");
    expect(audit).toContain('"tool":"caido_get_request"');
    expect(audit).not.toContain("integration-secret");
  });

  it.each([
    ["INVALID_HTTPQL", "INVALID_HTTPQL", false],
    ["UPSTREAM_ERROR", "UPSTREAM_ERROR", true],
    ["MALFORMED_DATA", "UPSTREAM_ERROR", false],
  ] as const)(
    "maps %s to deterministic %s without leaking boundary details",
    async (httpql, code, retryable) => {
    const mock = await createMockCaidoServer();
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido integration errors "));
    const harness = await createIntegrationRuntime(mock.url, directory, "read-only");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_list_requests",
      arguments: { httpql, limit: 2, direction: "descending" },
    });
    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: { code, retryable },
    });
    expect(JSON.stringify(result)).not.toMatch(/integration-secret|stack|graphql/i);
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
      error: { code: "AUTH_FAILED", retryable: false },
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
