import type { AuthOptions, TokenCache } from "@caido/sdk-client";

export function buildAuthOptions(
  env: NodeJS.ProcessEnv,
  cache: TokenCache,
  onRequest: (request: unknown) => void,
): AuthOptions {
  if (env.CAIDO_PAT !== undefined && env.CAIDO_PAT.length > 0) {
    return { pat: env.CAIDO_PAT, cache };
  }
  if (env.CAIDO_TOKEN !== undefined && env.CAIDO_TOKEN.length > 0) {
    return { token: env.CAIDO_TOKEN, cache };
  }
  return { cache, onRequest };
}
