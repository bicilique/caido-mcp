import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createMockCaidoServer } from "./mock-caido-server.js";
import { createIntegrationRuntime } from "./runtime-harness.js";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => Promise.all(cleanup.splice(0).map((close) => close())));

describe("mock Caido active integration", () => {
  it("selects one project through runtime, official SDK, adapter, and mock HTTP boundary", async () => {
    const mock = await createMockCaidoServer();
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido active integration "));
    const harness = await createIntegrationRuntime(mock.url, directory, "active");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_select_project",
      arguments: { projectId: "project-2" },
    });

    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        summary: "Selected one Caido project.",
        evidence: {
          mutation: "select_project",
          projectId: "project-2",
          requestIds: [],
        },
      },
      meta: { projectId: "project-2" },
    });
    expect(mock.operations("SelectProject")).toHaveLength(1);
  });

  it("returns a sanitized missing-project error from the real SDK boundary", async () => {
    const mock = await createMockCaidoServer();
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido missing project "));
    const harness = await createIntegrationRuntime(mock.url, directory, "active");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_select_project",
      arguments: { projectId: "missing-project" },
    });

    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: { retryable: false },
    });
    expect(mock.operations("SelectProject")).toHaveLength(1);
  });

  it("blocks denied raw sends before any Replay mutation reaches Caido", async () => {
    const mock = await createMockCaidoServer({
      scopeAllowlist: ["allowed.test"],
    });
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido active blocked "));
    const harness = await createIntegrationRuntime(mock.url, directory, "active");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_send_raw_request",
      arguments: {
        method: "GET",
        url: "http://127.0.0.1:18080/",
        headers: [],
      },
    });

    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: { code: "OUT_OF_SCOPE" },
    });
    expect(mock.operations("CreateReplaySession")).toHaveLength(0);
  });

  it("does not retry a sanitized Replay upstream error", async () => {
    const mock = await createMockCaidoServer({
      scopeAllowlist: ["127.0.0.1"],
      replay: "upstream-error",
    });
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido active upstream "));
    const harness = await createIntegrationRuntime(mock.url, directory, "active");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_send_raw_request",
      arguments: {
        method: "GET",
        url: "http://127.0.0.1:18080/",
        headers: [],
      },
    });

    expect(result.structuredContent).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("integration-secret");
    expect(mock.operations("CreateReplaySession")).toHaveLength(1);
  });

  it("completes one Replay mutation through HTTP and GraphQL WS boundaries", async () => {
    const mock = await createMockCaidoServer({
      scopeAllowlist: ["127.0.0.1"],
      replay: "success",
    });
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido active replay "));
    const harness = await createIntegrationRuntime(mock.url, directory, "active");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_send_raw_request",
      arguments: {
        method: "GET",
        url: "http://127.0.0.1:18080/success",
        headers: [],
      },
    });

    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        summary: "Sent one bounded raw request.",
        evidence: {
          mutation: "send_raw_request",
          requestIds: ["request-replayed"],
        },
      },
      meta: { requestIds: ["request-replayed"] },
    });
    expect(mock.operations("CreateReplaySession")).toHaveLength(1);
    expect(mock.operations("StartReplayTask")).toHaveLength(1);
  });

  it("bounds a stalled Replay request with the central timeout", async () => {
    const mock = await createMockCaidoServer({
      scopeAllowlist: ["127.0.0.1"],
      replay: "timeout",
    });
    cleanup.push(mock.close);
    const directory = await mkdtemp(join(tmpdir(), "caido active timeout "));
    const harness = await createIntegrationRuntime(mock.url, directory, "active");
    cleanup.push(harness.close);

    const result = await harness.client.callTool({
      name: "caido_send_raw_request",
      arguments: {
        method: "GET",
        url: "http://127.0.0.1:18080/",
        headers: [],
      },
    });

    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: { code: "TIMEOUT", retryable: true },
    });
    expect(mock.operations("CreateReplaySession")).toHaveLength(1);
  });
});
