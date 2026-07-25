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
  type CaidoSdkClient,
  type ConnectableCaidoClient,
} from "@caido-agent-kit/core";

import { createToolExecutor } from "./execution/pipeline.js";
import { promptDefinitions } from "./prompts/index.js";
import { createReadOnlyResources } from "./resources/index.js";
import { createServer } from "./server.js";
import { createReadOnlyTools } from "./tools/read/index.js";

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

export interface RuntimeDependencies {
  createClient(
    config: ReturnType<typeof parseConfig>,
    env: NodeJS.ProcessEnv,
    cache: SecureTokenCache,
    onRequest: (request: unknown) => void,
  ): RuntimeClient;
  connectClient(client: RuntimeClient): Promise<unknown>;
  createAdapter(
    client: CaidoSdkClient,
    initializationError?: AgentError,
  ): CaidoAdapter;
  createTransport(stdin: Readable, stdout: Writable): Transport;
}

const productionDependencies: RuntimeDependencies = {
  createClient: (config, env, cache, onRequest) =>
    createCaidoClient(config, env, cache, onRequest) as RuntimeClient,
  connectClient: connectCaido,
  createAdapter: (client, initializationError) =>
    new SdkCaidoAdapter(client, {
      ...(initializationError === undefined ? {} : { initializationError }),
    }),
  createTransport: (stdin, stdout) => new StdioServerTransport(stdin, stdout),
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
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const pending = connectClient(client);
  try {
    await Promise.race([
      pending,
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
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    void pending.catch(() => undefined);
  }
}

export async function createRuntime(
  env: NodeJS.ProcessEnv,
  io: RuntimeIO,
  dependencies: RuntimeDependencies = productionDependencies,
): Promise<Runtime> {
  const config = parseConfig(env);
  const tokenCache = new SecureTokenCache(config.tokenCache);
  const client = dependencies.createClient(config, env, tokenCache, () => {
    io.stderr.write(
      "Caido authentication requires completion in the configured browser.\n",
    );
  });
  let connectionError: AgentError | undefined;
  try {
    await connectWithinDeadline(
      client,
      config.requestTimeoutMs,
      dependencies.connectClient,
    );
  } catch (error) {
    connectionError = initializationError(error);
    io.stderr.write(`Caido connection diagnostic: ${connectionError.message}\n`);
  }

  const adapter = dependencies.createAdapter(client, connectionError);
  const auditLogger = new AuditLogger({
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
  const server = createServer({
    mode: config.mode,
    tools: createReadOnlyTools(adapter, options),
    resources: createReadOnlyResources(adapter, options),
    prompts: promptDefinitions,
    executor,
  });
  const transport = dependencies.createTransport(io.stdin, io.stdout);
  await server.connect(transport);

  let closing: Promise<void> | undefined;
  let resolveClosed: (() => void) | undefined;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });

  const close = (): Promise<void> => {
    closing ??= (async () => {
      io.signals?.off("SIGINT", onSignal);
      io.signals?.off("SIGTERM", onSignal);
      try {
        await server.close();
      } finally {
        try {
          await adapter.close();
        } finally {
          await auditLogger.flush();
          await auditLogger.close();
        }
      }
      resolveClosed?.();
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
