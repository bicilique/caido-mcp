import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { vi } from "vitest";

import {
  assertLoopbackTarget,
  closeE2eResources,
  startHttpFixture,
} from "../fixtures/http-server.js";
import { createIntegrationRuntime } from "../integration/runtime-harness.js";

const enabled = process.env.CAIDO_E2E === "1";

it("refuses any non-loopback E2E fixture target without contacting Caido", () => {
  expect(() => assertLoopbackTarget("https://example.com")).toThrow(
    /loopback/i,
  );
});

it("refuses a non-loopback Caido URL before runtime startup", async () => {
  await expect(
    createIntegrationRuntime(
      "https://example.com",
      await mkdtemp(join(tmpdir(), "caido refused e2e ")),
      "active",
    ),
  ).rejects.toThrow(/loopback/i);
});

it("attempts runtime and fixture cleanup independently", async () => {
  const runtimeClose = vi.fn(async () => {
    throw new Error("runtime close failed");
  });
  const fixtureClose = vi.fn(async () => {
    throw new Error("fixture close failed");
  });
  await expect(
    closeE2eResources({ close: runtimeClose }, { close: fixtureClose }),
  ).rejects.toThrow("runtime close failed");
  expect(runtimeClose).toHaveBeenCalledOnce();
  expect(fixtureClose).toHaveBeenCalledOnce();
});

describe.skipIf(!enabled)("real Caido localhost E2E", () => {
  it("verifies health, evidence, redaction, scope gating, Replay, audit, and shutdown", async () => {
    const caidoUrl = process.env.CAIDO_URL;
    const token = process.env.CAIDO_TOKEN;
    const projectId = process.env.CAIDO_E2E_PROJECT_ID;
    if (
      caidoUrl === undefined ||
      token === undefined ||
      projectId === undefined
    ) {
      throw new Error(
        "CAIDO_E2E=1 requires CAIDO_URL, CAIDO_TOKEN, and CAIDO_E2E_PROJECT_ID.",
      );
    }

    const directory = await mkdtemp(join(tmpdir(), "caido real e2e "));
    let fixture: Awaited<ReturnType<typeof startHttpFixture>> | undefined;
    let harness:
      | Awaited<ReturnType<typeof createIntegrationRuntime>>
      | undefined;
    try {
      fixture = await startHttpFixture();
      harness = await createIntegrationRuntime(
        caidoUrl,
        directory,
        "active",
        token,
      );
      const health = await harness.client.callTool({
        name: "caido_health",
        arguments: {},
      });
      expect(health.structuredContent).toMatchObject({
        ok: true,
        data: { reachable: true, authenticated: true },
      });

      const selected = await harness.client.callTool({
        name: "caido_select_project",
        arguments: { projectId },
      });
      expect(selected.structuredContent).toMatchObject({
        ok: true,
        data: { evidence: { projectId } },
      });

      const project = await harness.client.callTool({
        name: "caido_get_current_project",
        arguments: {},
      });
      expect(project.structuredContent).toMatchObject({
        ok: true,
        data: { id: projectId, selected: true },
      });

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
      const replayIds = (
        replayed.structuredContent as {
          data: { evidence: { requestIds: string[] } };
        }
      ).data.evidence.requestIds;
      expect(replayIds.length).toBeGreaterThan(0);
      const replayCreatedId = replayIds.find((id) => id !== requestIds[0]);
      expect(replayCreatedId).toBeDefined();

      for (const evidenceId of [requestIds[0], replayCreatedId!]) {
        const listed = await harness.client.callTool({
          name: "caido_list_requests",
          arguments: {
            httpql: `req.id.eq:"${evidenceId}"`,
            direction: "descending",
            limit: 20,
          },
        });
        expect(listed.structuredContent).toMatchObject({
          ok: true,
          data: { items: expect.any(Array) },
        });
        const listedIds = (
          listed.structuredContent as {
            data: { items: Array<{ id: string }> };
          }
        ).data.items.map((item) => item.id);
        expect(listedIds.length).toBeGreaterThan(0);
        expect(listedIds).toContain(evidenceId);
      }

      const detail = await harness.client.callTool({
        name: "caido_get_request",
        arguments: { requestIds: [requestIds[0]] },
      });
      expect(detail.structuredContent).toMatchObject({
        ok: true,
        data: [
          expect.objectContaining({
            id: requestIds[0],
            request: expect.any(Object),
          }),
        ],
      });
      expect(JSON.stringify(detail.structuredContent)).not.toContain(
        "e2e-secret",
      );
    } finally {
      await closeE2eResources(harness, fixture);
    }

    const audit = await readFile(join(directory, "audit.jsonl"), "utf8");
    expect(audit).toContain('"tool":"caido_replay_request"');
    expect(audit).not.toContain("e2e-secret");
    await expect(harness!.runtime.closed).resolves.toBeUndefined();
  });
});
