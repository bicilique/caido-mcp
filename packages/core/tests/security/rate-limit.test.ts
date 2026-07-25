import { describe, expect, it } from "vitest";

import { RateLimiter } from "../../src/security/rate-limit.js";

describe("RateLimiter", () => {
  it("rejects calls beyond the per-key window limit", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 1000 });

    limiter.consume("caido_list_requests", 100);
    limiter.consume("caido_list_requests", 200);

    expect(() => limiter.consume("caido_list_requests", 300)).toThrow(
      /rate limit/i,
    );
  });

  it("tracks keys independently and resets after the window", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 });

    limiter.consume("read", 100);
    limiter.consume("write", 100);

    expect(() => limiter.consume("read", 1000)).toThrow(/rate limit/i);
    expect(() => limiter.consume("read", 1100)).not.toThrow();
  });
});
