import { describe, expect, it } from "vitest";

import { AgentError, normalizeError } from "../src/errors.js";

describe("normalizeError", () => {
  it("preserves a safe domain error contract", () => {
    expect(
      normalizeError(
        new AgentError(
          "OUT_OF_SCOPE",
          "The destination is outside the selected Caido scope.",
          false,
          "Add an explicit allow rule or choose an in-scope target.",
        ),
      ),
    ).toEqual({
      code: "OUT_OF_SCOPE",
      message: "The destination is outside the selected Caido scope.",
      retryable: false,
      remediation: "Add an explicit allow rule or choose an in-scope target.",
    });
  });

  it("does not expose an unknown upstream error message", () => {
    const normalized = normalizeError(
      new Error("Authorization: Bearer super-secret-token"),
    );

    expect(normalized).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected internal error occurred.",
      retryable: false,
    });
    expect(JSON.stringify(normalized)).not.toContain("super-secret-token");
  });
});
