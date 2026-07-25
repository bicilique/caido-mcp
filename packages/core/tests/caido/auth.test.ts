import { describe, expect, it } from "vitest";

import type { TokenCache } from "@caido/sdk-client";

import { buildAuthOptions } from "../../src/caido/auth.js";

const cache: TokenCache = {
  load: async () => undefined,
  save: async () => undefined,
  clear: async () => undefined,
};

describe("buildAuthOptions", () => {
  it("prefers a PAT and always attaches the hardened cache", () => {
    expect(
      buildAuthOptions(
        { CAIDO_PAT: "pat-secret", CAIDO_TOKEN: "direct-secret" },
        cache,
        () => undefined,
      ),
    ).toEqual({ pat: "pat-secret", cache });
  });

  it("uses an explicitly configured direct token when no PAT exists", () => {
    expect(
      buildAuthOptions(
        { CAIDO_TOKEN: "direct-secret" },
        cache,
        () => undefined,
      ),
    ).toEqual({ token: "direct-secret", cache });
  });

  it("falls back to interactive authentication without printing a URL", () => {
    const onRequest = () => undefined;

    expect(buildAuthOptions({}, cache, onRequest)).toEqual({
      cache,
      onRequest,
    });
  });
});
