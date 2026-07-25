import {
  Client,
  type ClientOptions,
  type Logger,
  type TokenCache,
} from "@caido/sdk-client";

import type { AgentConfig } from "../config.js";
import { AgentError } from "../errors.js";
import { buildAuthOptions } from "./auth.js";

export interface CaidoHealth {
  name: string;
  version: string;
  ready: boolean;
}

export interface ConnectableCaidoClient {
  connect(): Promise<void>;
  health(): Promise<CaidoHealth>;
}

export type ProductionCaidoClient = Client;

const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

type ClientFactory<T extends ConnectableCaidoClient> = (
  options: ClientOptions,
) => T;

export function createCaidoClient(
  config: AgentConfig,
  env: NodeJS.ProcessEnv,
  cache: TokenCache,
  onRequest: (request: unknown) => void,
): Client;
export function createCaidoClient<T extends ConnectableCaidoClient>(
  config: AgentConfig,
  env: NodeJS.ProcessEnv,
  cache: TokenCache,
  onRequest: (request: unknown) => void,
  factory: ClientFactory<T>,
): T;
export function createCaidoClient(
  config: AgentConfig,
  env: NodeJS.ProcessEnv,
  cache: TokenCache,
  onRequest: (request: unknown) => void,
  factory: ClientFactory<ConnectableCaidoClient> = (options) =>
    new Client(options),
): ConnectableCaidoClient {
  return factory({
    url: config.caidoUrl,
    auth: buildAuthOptions(env, cache, onRequest),
    request: { timeout: config.requestTimeoutMs },
    logger: silentLogger,
  });
}

export async function connectCaido<T extends ConnectableCaidoClient>(
  client: T,
): Promise<T> {
  try {
    await client.connect();
    return client;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new AgentError(
        "CAIDO_UNREACHABLE",
        "The configured Caido instance is unreachable.",
        true,
        "Start Caido and verify CAIDO_URL, then retry.",
      );
    }
    throw new AgentError(
      "AUTH_FAILED",
      "Authentication with Caido failed.",
      false,
      "Verify the configured credential or clear the token cache and sign in again.",
    );
  }
}
