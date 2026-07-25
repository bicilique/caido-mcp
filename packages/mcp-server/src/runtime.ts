import type { Readable, Writable } from "node:stream";

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  AgentError,
  AuditLogger,
  RateLimiter,
  SecureTokenCache,
  SdkCaidoAdapter,
  connectCaido,
  createCaidoClient,
  parseConfig,
  type CaidoAdapter,
  type CaidoInitializationState,
  type CaidoSdkClient,
  type ConnectableCaidoClient,
} from "@caido-agent-kit/core";

import { createToolExecutor } from "./execution/pipeline.js";
import { promptDefinitions } from "./prompts/index.js";
import { createReadOnlyResources } from "./resources/index.js";
import { createServer } from "./server.js";
import { createActiveTools } from "./tools/active/index.js";
import { createReadOnlyTools } from "./tools/read/index.js";
import type { ToolDefinition } from "./registry.js";

export interface SignalSource {
  on(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  off(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
}

export interface RuntimeIO {
  stdin: Readable;
  stdout: Writable;
  stderr: Pick<Writable, "write">;
  signals?: SignalSource;
  exit?: (code: number) => void;
}

type RuntimeClient = CaidoSdkClient & ConnectableCaidoClient;

interface RuntimeTokenCache {
  load(): ReturnType<SecureTokenCache["load"]>;
  save(
    token: Parameters<SecureTokenCache["save"]>[0],
  ): ReturnType<SecureTokenCache["save"]>;
  clear(): ReturnType<SecureTokenCache["clear"]>;
}

class OwnedTokenCache implements RuntimeTokenCache {
  readonly #delegate: SecureTokenCache;
  #owned = true;

  constructor(delegate: SecureTokenCache) {
    this.#delegate = delegate;
  }

  revoke(): void {
    this.#owned = false;
  }

  async load(): ReturnType<SecureTokenCache["load"]> {
    return this.#owned ? this.#delegate.load() : undefined;
  }

  async save(
    token: Parameters<SecureTokenCache["save"]>[0],
  ): ReturnType<SecureTokenCache["save"]> {
    if (this.#owned) await this.#delegate.save(token);
  }

  async clear(): ReturnType<SecureTokenCache["clear"]> {
    if (this.#owned) await this.#delegate.clear();
  }
}

class ClientCleanupOwner {
  readonly #client: RuntimeClient;
  readonly #closeClient: NonNullable<RuntimeDependencies["closeClient"]>;
  #closing: Promise<void> | undefined;

  constructor(
    client: RuntimeClient,
    closeClient: NonNullable<RuntimeDependencies["closeClient"]>,
  ) {
    this.#client = client;
    this.#closeClient = closeClient;
  }

  close = (): Promise<void> => {
    this.#closing ??= Promise.resolve().then(() =>
      this.#closeClient(this.#client),
    );
    return this.#closing;
  };
}

export interface RuntimeDependencies {
  createClient(
    config: ReturnType<typeof parseConfig>,
    env: NodeJS.ProcessEnv,
    cache: RuntimeTokenCache,
    onRequest: (request: unknown) => void,
  ): RuntimeClient;
  connectClient(client: RuntimeClient): Promise<unknown>;
  createAdapter(
    client: CaidoSdkClient,
    initializationState: CaidoInitializationState,
    closeClient: () => Promise<void>,
  ): CaidoAdapter;
  createTransport(stdin: Readable, stdout: Writable): Transport;
  createAuditLogger?: (
    options: ConstructorParameters<typeof AuditLogger>[0],
  ) => Pick<AuditLogger, "record" | "flush" | "close">;
  closeClient?: (client: RuntimeClient) => Promise<void>;
  createActiveTools?: (
    adapter: CaidoAdapter,
    options: { bodyLimit: number; maxBatch: number },
  ) => readonly ToolDefinition[];
}

const productionDependencies: RuntimeDependencies = {
  createClient: (config, env, cache, onRequest) =>
    createCaidoClient(config, env, cache, onRequest) as RuntimeClient,
  connectClient: connectCaido,
  createAdapter: (client, initializationState, closeClient) =>
    new SdkCaidoAdapter(client, {
      initializationState,
      closeClient,
    }),
  createTransport: (stdin, stdout) => new StdioServerTransport(stdin, stdout),
  createAuditLogger: (options) => new AuditLogger(options),
  closeClient: async (client) => {
    if (client.close !== undefined) {
      await client.close();
    } else if (client.disconnect !== undefined) {
      await client.disconnect();
    }
  },
  createActiveTools,
};

export interface Runtime {
  readonly adapter: CaidoAdapter;
  readonly closed: Promise<void>;
  close(): Promise<void>;
}

function initializationError(error: unknown): AgentError {
  return error instanceof AgentError
    ? error
    : new AgentError(
        "UPSTREAM_ERROR",
        "Caido SDK initialization failed.",
        true,
        "Verify the Caido URL and credentials, then retry.",
      );
}

async function connectWithinDeadline(
  client: RuntimeClient,
  timeoutMs: number,
  connectClient: RuntimeDependencies["connectClient"],
  closeClient: () => Promise<void>,
  revokeOwnership: () => void,
  signal: AbortSignal,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const pending = connectClient(client);
  let owned = true;
  const closeLateConnection = async (): Promise<void> => {
    if (!owned) await closeClient();
  };
  void pending.then(closeLateConnection, () => undefined).catch(() => undefined);
  let rejectAborted: ((error: AgentError) => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectAborted = reject;
  });
  const onAbort = (): void => {
    rejectAborted?.(
      new AgentError(
        "CAIDO_UNREACHABLE",
        "Caido initialization was cancelled during shutdown.",
        true,
      ),
    );
  };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    await Promise.race([
      pending,
      aborted,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new AgentError(
                "CAIDO_UNREACHABLE",
                "The configured Caido instance is unreachable.",
                true,
                "Start Caido and verify CAIDO_URL, then retry.",
              ),
            ),
          timeoutMs,
        );
        timer.unref();
      }),
    ]);
  } catch (error) {
    owned = false;
    revokeOwnership();
    try {
      await closeClient();
    } catch {
      // Initialization remains failed even when the SDK has no close primitive.
    }
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    void pending.catch(() => undefined);
  }
}

export async function createRuntime(
  env: NodeJS.ProcessEnv,
  io: RuntimeIO,
  dependencies: RuntimeDependencies = productionDependencies,
): Promise<Runtime> {
  const config = parseConfig(env);
  const tokenCache = new OwnedTokenCache(
    new SecureTokenCache(config.tokenCache),
  );
  const initializationState: CaidoInitializationState = {};
  const client = dependencies.createClient(config, env, tokenCache, () => {
    io.stderr.write(
      "Caido authentication requires completion in the configured browser.\n",
    );
  });
  const cleanupOwner = new ClientCleanupOwner(
    client,
    dependencies.closeClient ?? productionDependencies.closeClient!,
  );
  const adapter = dependencies.createAdapter(
    client,
    initializationState,
    cleanupOwner.close,
  );
  const auditLogger =
    dependencies.createAuditLogger?.({
      path: config.auditLog,
      maxBytes: 1_048_576,
      maxFiles: 5,
    }) ??
    new AuditLogger({
      path: config.auditLog,
      maxBytes: 1_048_576,
      maxFiles: 5,
    });
  const executor = createToolExecutor({
    config,
    auditLogger,
    rateLimiter: new RateLimiter({ limit: 60, windowMs: 60_000 }),
  });
  const options = { bodyLimit: config.bodyLimit, maxBatch: config.maxBatch };
  const activeTools =
    config.mode === "active"
      ? (dependencies.createActiveTools?.(adapter, options) ?? [])
      : [];
  const server = createServer({
    mode: config.mode,
    tools: [...createReadOnlyTools(adapter, options), ...activeTools],
    resources: createReadOnlyResources(adapter, options),
    prompts: promptDefinitions,
    executor,
  });
  const transport = dependencies.createTransport(io.stdin, io.stdout);
  const startup = new AbortController();

  let closing: Promise<void> | undefined;
  let resolveClosed: (() => void) | undefined;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });

  const close = (): Promise<void> => {
    closing ??= (async () => {
      io.signals?.off("SIGINT", onSignal);
      io.signals?.off("SIGTERM", onSignal);
      tokenCache.revoke();
      startup.abort();
      const errors: unknown[] = [];
      for (const operation of [
        () => server.close(),
        () => adapter.close(),
        () => auditLogger.flush(),
        () => auditLogger.close(),
      ]) {
        try {
          await operation();
        } catch (error) {
          errors.push(error);
        }
      }
      resolveClosed?.();
      if (errors.length > 0) throw errors[0];
    })();
    return closing;
  };

  const onSignal = (): void => {
    void close()
      .then(() => io.exit?.(0))
      .catch((error: unknown) => {
        io.stderr.write(
          `Caido shutdown diagnostic: ${
            error instanceof Error ? error.message : "unknown error"
          }\n`,
        );
        io.exit?.(1);
      });
  };

  io.signals?.on("SIGINT", onSignal);
  io.signals?.on("SIGTERM", onSignal);

  let connectionError: AgentError | undefined;
  try {
    await connectWithinDeadline(
      client,
      config.requestTimeoutMs,
      dependencies.connectClient,
      cleanupOwner.close,
      () => tokenCache.revoke(),
      startup.signal,
    );
  } catch (error) {
    tokenCache.revoke();
    connectionError = initializationError(error);
    initializationState.initializationError = connectionError;
    io.stderr.write(`Caido connection diagnostic: ${connectionError.message}\n`);
  }

  if (!startup.signal.aborted) {
    const connecting = server.connect(transport);
    let rejectAborted: ((error: Error) => void) | undefined;
    const aborted = new Promise<never>((_, reject) => {
      rejectAborted = reject;
    });
    const onAbort = (): void =>
      rejectAborted?.(new Error("MCP startup cancelled"));
    startup.signal.addEventListener("abort", onAbort, { once: true });
    try {
      await Promise.race([connecting, aborted]);
    } catch (error) {
      void connecting.catch(() => undefined);
      if (!startup.signal.aborted) {
        try {
          await close();
        } catch (cleanupError) {
          io.stderr.write(
            `Caido startup cleanup diagnostic: ${
              cleanupError instanceof Error
                ? cleanupError.message
                : "unknown error"
            }\n`,
          );
        }
        throw error;
      }
    } finally {
      startup.signal.removeEventListener("abort", onAbort);
    }
  }

  return { adapter, closed, close };
}

export async function runStdioServer(): Promise<Runtime> {
  return createRuntime(process.env, {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    signals: process,
    exit: (code) => process.exit(code),
  });
}
