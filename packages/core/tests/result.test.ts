import { describe, expect, it } from "vitest";

import { errorResult, successResult } from "../src/result.js";

describe("ToolResult", () => {
  it("creates a stable success envelope", () => {
    expect(successResult("caido_health", { reachable: true })).toEqual({
      ok: true,
      data: { reachable: true },
      meta: { tool: "caido_health" },
      warnings: [],
    });
  });

  it("preserves evidence metadata without inventing fields", () => {
    expect(
      successResult(
        "caido_get_request",
        { id: "req-1" },
        {
          projectId: "project-1",
          requestIds: ["req-1"],
          untrusted: true,
          source: "caido_http_traffic",
        },
      ),
    ).toMatchObject({
      meta: {
        tool: "caido_get_request",
        projectId: "project-1",
        requestIds: ["req-1"],
        untrusted: true,
        source: "caido_http_traffic",
      },
    });
  });

  it("creates a deterministic error envelope", () => {
    expect(
      errorResult("caido_list_requests", {
        code: "TIMEOUT",
        message: "Caido did not respond before the configured timeout.",
        retryable: true,
        remediation: "Confirm Caido is running, then retry.",
      }),
    ).toEqual({
      ok: false,
      meta: { tool: "caido_list_requests" },
      warnings: [],
      error: {
        code: "TIMEOUT",
        message: "Caido did not respond before the configured timeout.",
        retryable: true,
        remediation: "Confirm Caido is running, then retry.",
      },
    });
  });
});
