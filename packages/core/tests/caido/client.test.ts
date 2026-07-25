import { describe, expect, it } from "vitest";

import { AgentError } from "../../src/errors.js";
import {
  connectCaido,
  createCaidoClient,
  type ConnectableCaidoClient,
} from "../../src/caido/client.js";
import { parseConfig } from "../../src/config.js";
import type { ClientOptions, TokenCache } from "@caido/sdk-client";

describe("connectCaido", () => {
  it("constructs the official client with bounded requests and hardened auth", () => {
    const options: ClientOptions[] = [];
    const cache: TokenCache = {
      load: async () => undefined,
      save: async () => undefined,
      clear: async () => undefined,
    };
    const client: ConnectableCaidoClient = {
      connect: async () => undefined,
      health: async () => ({ name: "caido", version: "0.57.1", ready: true }),
    };

    const created = createCaidoClient(
      parseConfig({
        CAIDO_URL: "http://localhost:9090",
        CAIDO_REQUEST_TIMEOUT_MS: "5000",
      }),
      { CAIDO_PAT: "pat-secret" },
      cache,
      () => undefined,
      (value) => {
        options.push(value);
        return client;
      },
    );

    expect(created).toBe(client);
    expect(options).toEqual([
      {
        url: "http://localhost:9090",
        auth: { pat: "pat-secret", cache },
        request: { timeout: 5000 },
        logger: expect.objectContaining({
          debug: expect.any(Function),
          info: expect.any(Function),
          warn: expect.any(Function),
          error: expect.any(Function),
        }),
      },
    ]);
  });

  it("connects before returning the client", async () => {
    const events: string[] = [];
    const client: ConnectableCaidoClient = {
      connect: async () => {
        events.push("connect");
      },
      health: async () => {
        events.push("health");
        return { name: "caido", version: "0.57.1", ready: true };
      },
    };

    const connected = await connectCaido(client);
    await connected.health();

    expect(events).toEqual(["connect", "health"]);
  });

  it("maps an unreachable instance to a safe deterministic error", async () => {
    const client: ConnectableCaidoClient = {
      connect: async () => {
        throw new TypeError("fetch failed: Authorization Bearer secret");
      },
      health: async () => ({ name: "caido", version: "0.57.1", ready: false }),
    };

    await expect(connectCaido(client)).rejects.toEqual(
      new AgentError(
        "CAIDO_UNREACHABLE",
        "The configured Caido instance is unreachable.",
        true,
        "Start Caido and verify CAIDO_URL, then retry.",
      ),
    );
  });
});
