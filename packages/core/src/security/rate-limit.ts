interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface WindowState {
  startedAt: number;
  count: number;
}

export class RateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #windows = new Map<string, WindowState>();

  constructor(options: RateLimitOptions) {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new Error("Rate limit must be a positive integer.");
    }
    if (!Number.isInteger(options.windowMs) || options.windowMs < 1) {
      throw new Error("Rate-limit window must be a positive integer.");
    }
    this.#limit = options.limit;
    this.#windowMs = options.windowMs;
  }

  consume(key: string, now = Date.now()): void {
    const current = this.#windows.get(key);
    if (current === undefined || now - current.startedAt >= this.#windowMs) {
      this.#windows.set(key, { startedAt: now, count: 1 });
      return;
    }
    if (current.count >= this.#limit) {
      throw new Error("Rate limit exceeded.");
    }
    current.count += 1;
  }
}
