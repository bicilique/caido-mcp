import { describe, expect, it } from "vitest";

import {
  redactHeaders,
  redactRawHttp,
  redactStructured,
  redactUrl,
} from "../../src/security/redaction.js";

describe("sensitive-data redaction", () => {
  it("preserves names and redacts duplicate mixed-case headers", () => {
    expect(
      redactHeaders([
        ["authorization", "Bearer secret"],
        ["COOKIE", "sid=secret"],
        ["Cookie", "other=secret"],
        ["Content-Type", "application/json"],
      ]),
    ).toEqual([
      ["authorization", "[REDACTED]"],
      ["COOKIE", "[REDACTED]"],
      ["Cookie", "[REDACTED]"],
      ["Content-Type", "application/json"],
    ]);
  });

  it("redacts folded and malformed sensitive raw headers", () => {
    const raw = [
      "GET / HTTP/1.1",
      "Host: example.test",
      "Authorization: Bearer first",
      " second-line",
      "X-Api-Key: secret",
      "Malformed",
      "",
      "",
    ].join("\r\n");

    expect(redactRawHttp(raw)).toBe(
      [
        "GET / HTTP/1.1",
        "Host: example.test",
        "Authorization: [REDACTED]",
        " [REDACTED]",
        "X-Api-Key: [REDACTED]",
        "Malformed",
        "",
        "",
      ].join("\r\n"),
    );
  });

  it("redacts nested token-like structured fields", () => {
    expect(
      redactStructured({
        profile: {
          accessToken: "secret",
          api_key: "secret",
          displayName: "Ada",
        },
        sessionId: "secret",
      }),
    ).toEqual({
      profile: {
        accessToken: "[REDACTED]",
        api_key: "[REDACTED]",
        displayName: "Ada",
      },
      sessionId: "[REDACTED]",
    });
  });

  it("redacts token-like query parameters while preserving other parameters", () => {
    expect(
      redactUrl(
        "https://example.test/path?access_token=secret&page=2&api_key=secret",
      ),
    ).toBe(
      "https://example.test/path?access_token=%5BREDACTED%5D&page=2&api_key=%5BREDACTED%5D",
    );
  });
});
