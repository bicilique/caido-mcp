import { PassThrough } from "node:stream";

import {
  SdkCaidoAdapter,
  connectCaido,
  createCaidoClient,
} from "../../packages/core/src/index.js";
import { Client as CaidoClient } from "@caido/sdk-client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createRuntime } from "../../packages/mcp-server/src/runtime.js";
import { createActiveTools } from "../../packages/mcp-server/src/tools/active/index.js";
import { assertLoopbackTarget } from "../fixtures/http-server.js";

export async function createIntegrationRuntime(
  caidoUrl: string,
  directory: string,
  mode: "read-only" | "active",
  token:
    | string
    | { accessToken: string; refreshToken: string } = "integration-token",
) {
  assertLoopbackTarget(caidoUrl);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const runtime = await createRuntime(
    {
      CAIDO_URL: caidoUrl,
      ...(typeof token === "string" ? { CAIDO_TOKEN: token } : {}),
      CAIDO_AGENT_MODE: mode,
      CAIDO_AUDIT_LOG: `${directory}/audit.jsonl`,
      CAIDO_TOKEN_CACHE: `${directory}/tokens.json`,
      CAIDO_REQUEST_TIMEOUT_MS: "500",
    },
    {
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
    },
    {
      createClient: (config, env, cache, onRequest) =>
        typeof token === "string"
          ? createCaidoClient(config, env, cache, onRequest)
          : new CaidoClient({
              url: config.caidoUrl,
              auth: { token, cache },
              request: { timeout: config.requestTimeoutMs },
              logger: {
                debug: () => undefined,
                info: () => undefined,
                warn: () => undefined,
                error: () => undefined,
              },
            }),
      connectClient: connectCaido,
      createAdapter: (sdk, initializationState, closeClient) =>
        new SdkCaidoAdapter(sdk, { initializationState, closeClient }),
      createTransport: () => serverTransport,
      createActiveTools,
    },
  );
  const client = new Client({ name: "integration", version: "1.0.0" });
  await client.connect(clientTransport);

  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closing ??= (async () => {
      await client.close();
      await runtime.close();
    })();
    return closing;
  };
  return { client, runtime, close };
}
