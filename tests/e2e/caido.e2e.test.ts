import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { assertLoopbackTarget, startHttpFixture } from "../fixtures/http-server.js";
import { createIntegrationRuntime } from "../integration/runtime-harness.js";

const enabled = process.env.CAIDO_E2E === "1";

it("refuses any non-loopback E2E fixture target without contacting Caido", () => {
  expect(() => assertLoopbackTarget("https://example.com")).toThrow(/loopback/i);
});

describe.skipIf(!enabled)("real Caido localhost E2E", () => {
  it("verifies health, evidence, redaction, scope gating, Replay, audit, and shutdown", async () => {
    const caidoUrl = process.env.CAIDO_URL;
    const token = process.env.CAIDO_TOKEN;
    if (caidoUrl === undefined || token === undefined) {
      throw new Error("CAIDO_E2E=1 requires CAIDO_URL and CAIDO_TOKEN.");
    }

    const fixture = await startHttpFixture();
    const directory = await mkdtemp(join(tmpdir(), "caido real e2e "));
    const harness = await createIntegrationRuntime(
      caidoUrl,
      directory,
      "active",
      token,
    );
    try {
      const health = await harness.client.callTool({
        name: "caido_health",
        arguments: {},
      });
      expect(health.structuredContent).toMatchObject({
        ok: true,
        data: { reachable: true, authenticated: true },
      });

      const project = await harness.client.callTool({
        name: "caido_get_current_project",
        arguments: {},
      });
      expect(project.structuredContent).toMatchObject({ ok: true });

      const blocked = await harness.client.callTool({
        name: "caido_send_raw_request",
        arguments: {
          method: "GET",
          url: "https://public.example.invalid/",
          headers: [],
        },
      });
      expect(blocked.structuredContent).toMatchObject({
        ok: false,
        error: { code: "OUT_OF_SCOPE" },
      });

      const sent = await harness.client.callTool({
        name: "caido_send_raw_request",
        arguments: {
          method: "GET",
          url: fixture.url,
          headers: [["Authorization", "Bearer e2e-secret"]],
        },
      });
      expect(sent.structuredContent).toMatchObject({
        ok: true,
        data: {
          evidence: {
            mutation: "send_raw_request",
            requestIds: expect.any(Array),
          },
        },
      });
      const requestIds = (
        sent.structuredContent as {
          data: { evidence: { requestIds: string[] } };
        }
      ).data.evidence.requestIds;
      expect(requestIds.length).toBeGreaterThan(0);

      const replayed = await harness.client.callTool({
        name: "caido_replay_request",
        arguments: {
          requestId: requestIds[0],
          headers: [["Authorization", "Bearer e2e-secret"]],
          body: "",
          contentType: "text/plain",
        },
      });
      expect(replayed.structuredContent).toMatchObject({
        ok: true,
        data: {
          evidence: {
            mutation: "replay_request",
            requestIds: expect.any(Array),
          },
        },
      });

      const listed = await harness.client.callTool({
        name: "caido_list_requests",
        arguments: {
          direction: "descending",
          limit: 5,
        },
      });
      expect(listed.structuredContent).toMatchObject({ ok: true });

      const detail = await harness.client.callTool({
        name: "caido_get_request",
        arguments: { requestIds: [requestIds[0]] },
      });
      expect(JSON.stringify(detail)).not.toContain("e2e-secret");
    } finally {
      await harness.close();
      await fixture.close();
    }

    const audit = await readFile(join(directory, "audit.jsonl"), "utf8");
    expect(audit).toContain('"tool":"caido_replay_request"');
    expect(audit).not.toContain("e2e-secret");
    await expect(harness.runtime.closed).resolves.toBeUndefined();
  });
});
