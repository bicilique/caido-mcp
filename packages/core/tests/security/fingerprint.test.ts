import { describe, expect, it } from "vitest";

import { fingerprintResponse } from "../../src/security/fingerprint.js";

describe("fingerprintResponse", () => {
  it("is stable across header-name case and input order", () => {
    const first = fingerprintResponse({
      statusCode: 200,
      headers: [
        ["Content-Type", "text/plain"],
        ["X-Request-Id", "one"],
      ],
      body: new TextEncoder().encode("ok"),
    });
    const second = fingerprintResponse({
      statusCode: 200,
      headers: [
        ["x-request-id", "one"],
        ["content-type", "text/plain"],
      ],
      body: new TextEncoder().encode("ok"),
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when the response body changes", () => {
    const response = {
      statusCode: 200,
      headers: [["Content-Type", "text/plain"]] as [string, string][],
    };

    expect(
      fingerprintResponse({
        ...response,
        body: new TextEncoder().encode("allowed"),
      }),
    ).not.toBe(
      fingerprintResponse({
        ...response,
        body: new TextEncoder().encode("denied"),
      }),
    );
  });
});
