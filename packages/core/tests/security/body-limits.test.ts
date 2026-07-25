import { describe, expect, it } from "vitest";

import { boundBody } from "../../src/security/body-limits.js";

describe("boundBody", () => {
  it("returns bounded text with byte metadata and digest", () => {
    const result = boundBody(
      new TextEncoder().encode("0123456789"),
      "text/plain; charset=utf-8",
      { offset: 2, limit: 4, hardLimit: 8 },
    );

    expect(result).toEqual({
      contentType: "text/plain; charset=utf-8",
      byteLength: 10,
      offset: 2,
      limit: 4,
      truncated: true,
      sha256:
        "84d89877f0d4041efb6bf91a16f0248f2fd573e6af05c19f96bedb9f882f7882",
      text: "2345",
    });
  });

  it("returns metadata rather than raw bytes for binary content", () => {
    const result = boundBody(
      Uint8Array.from([0, 1, 2, 3]),
      "application/octet-stream",
      { offset: 0, limit: 4, hardLimit: 8 },
    );

    expect(result).toEqual({
      contentType: "application/octet-stream",
      byteLength: 4,
      offset: 0,
      limit: 4,
      truncated: false,
      sha256:
        "054edec1d0211f624fed0cbca9d4f9400b0e491c43742af2c5b0abebf0c990d8",
    });
  });

  it("rejects a caller limit above the server hard limit", () => {
    expect(() =>
      boundBody(new Uint8Array(), "text/plain", {
        offset: 0,
        limit: 9,
        hardLimit: 8,
      }),
    ).toThrow(/hard limit/i);
  });
});
