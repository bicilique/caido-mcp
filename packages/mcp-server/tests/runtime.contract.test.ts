import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createRuntime } from "../src/runtime.js";
import type { ToolDefinition } from "../src/registry.js";
import { createTestAdapter } from "./support/adapter.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("production runtime", () => {
  it("assembles read-only discovery through the execution pipeline and audit log", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido runtime with spaces "));
    directories.push(directory);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const adapter = createTestAdapter({
      health: async () => ({
        reachable: false,
        authenticated: false,
      }),
    });
    const runtime = await createRuntime(
      {
        CAIDO_AGENT_MODE: "read-only",
        CAIDO_AUDIT_LOG: join(directory, "audit log.jsonl"),
        CAIDO_TOKEN_CACHE: join(directory, "token cache.json"),
      },
      {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
      },
      {
        createAdapter: () => adapter,
        createClient: () => ({}) as never,
        connectClient: async () => undefined,
        createTransport: () => serverTransport,
      },
    );
    const client = new Client({ name: "runtime-test", version: "1.0.0" });
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("caido_health");
    const health = await client.callTool({
      name: "caido_health",
      arguments: {},
    });
    expect(health.structuredContent).toMatchObject({
      ok: true,
      data: { reachable: false, authenticated: false },
    });

    await client.close();
    await runtime.close();
    expect(await readFile(join(directory, "audit log.jsonl"), "utf8")).toContain(
      '"tool":"caido_health"',
    );
  });

  it("handles SIGTERM by closing MCP, adapter, and audit resources before exit", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido runtime signal "));
    directories.push(directory);
    const signals = new EventEmitter();
    const events: string[] = [];
    const adapter = createTestAdapter({
      close: async () => {
        events.push("adapter");
      },
    });
    const runtime = await createRuntime(
      {
        CAIDO_AUDIT_LOG: join(directory, "audit.jsonl"),
        CAIDO_TOKEN_CACHE: join(directory, "tokens.json"),
      },
      {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        signals,
        exit: (code) => {
          events.push(`exit:${code}`);
        },
      },
      {
        createAdapter: () => adapter,
        createClient: () => ({}) as never,
        connectClient: async () => undefined,
        createTransport: () => {
          const [, serverTransport] = InMemoryTransport.createLinkedPair();
          const close = serverTransport.close.bind(serverTransport);
          serverTransport.close = async () => {
            events.push("mcp");
            await close();
          };
          return serverTransport;
        },
      },
    );

    signals.emit("SIGTERM");
    await runtime.closed;
    await expect.poll(() => events.includes("exit:0")).toBe(true);

    expect(events.filter((event) => event !== "mcp")).toEqual([
      "adapter",
      "exit:0",
    ]);
    expect(events.indexOf("mcp")).toBeLessThan(events.indexOf("adapter"));
  });

  it("installs signal cleanup before a slow SDK connection completes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido runtime startup signal "));
    directories.push(directory);
    const signals = new EventEmitter();
    const events: string[] = [];
    let resolveConnect: (() => void) | undefined;
    const pending = createRuntime(
      {
        CAIDO_REQUEST_TIMEOUT_MS: "1000",
        CAIDO_AUDIT_LOG: join(directory, "audit.jsonl"),
        CAIDO_TOKEN_CACHE: join(directory, "tokens.json"),
      },
      {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        signals,
        exit: (code) => events.push(`exit:${code}`),
      },
      {
        createAdapter: () =>
          createTestAdapter({
            close: async () => {
              events.push("adapter");
            },
          }),
        createClient: () => ({}) as never,
        connectClient: () =>
          new Promise<void>((resolve) => {
            resolveConnect = resolve;
          }),
        createTransport: () => {
          const [, transport] = InMemoryTransport.createLinkedPair();
          return transport;
        },
        createAuditLogger: () => ({
          record: async () => undefined,
          flush: async () => {
            events.push("audit-flush");
          },
          close: async () => {
            events.push("audit-close");
          },
        }),
      },
    );

    await new Promise((resolve) => setImmediate(resolve));
    signals.emit("SIGTERM");
    resolveConnect?.();
    const runtime = await pending;
    await runtime.closed;
    await expect.poll(() => events.includes("exit:0")).toBe(true);

    expect(events).toEqual([
      "adapter",
      "audit-flush",
      "audit-close",
      "exit:0",
    ]);
  });

  it("owns timed-out SDK initialization and closes a late successful connection", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido runtime late sdk "));
    directories.push(directory);
    const events: string[] = [];
    const tokenPath = join(directory, "tokens.json");
    let resolveConnect: (() => void) | undefined;
    let resolveClose: (() => void) | undefined;
    let closeCalls = 0;
    let tokenCache:
      | {
          save(token: {
            accessToken: string;
            refreshToken?: string;
            expiresAt?: string;
          }): Promise<void>;
        }
      | undefined;
    let state:
      | { initializationError?: { code: string } }
      | undefined;
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    const pendingRuntime = createRuntime(
      {
        CAIDO_REQUEST_TIMEOUT_MS: "5",
        CAIDO_AUDIT_LOG: join(directory, "audit.jsonl"),
        CAIDO_TOKEN_CACHE: tokenPath,
      },
      {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
      },
      {
        createAdapter: (_client, initializationState, closeClient) => {
          state = initializationState;
          return createTestAdapter({ close: closeClient });
        },
        createClient: (_config, _env, cache) => {
          tokenCache = cache;
          return {} as never;
        },
        connectClient: async () => {
          await new Promise<void>((resolve) => {
            resolveConnect = resolve;
          });
          await tokenCache?.save({
            accessToken: "late-access-token",
            refreshToken: "late-refresh-token",
          });
        },
        closeClient: async () => {
          closeCalls += 1;
          events.push("close-client");
          await new Promise<void>((resolve) => {
            resolveClose = resolve;
          });
        },
        createTransport: () => serverTransport,
      },
    );

    await expect
      .poll(() => events.includes("close-client"), { timeout: 1_000 })
      .toBe(true);
    resolveConnect?.();
    await new Promise((resolve) => setTimeout(resolve, 25));
    await expect(readFile(tokenPath, "utf8")).rejects.toThrow();
    resolveClose?.();
    const runtime = await pendingRuntime;
    expect(state?.initializationError?.code).toBe("CAIDO_UNREACHABLE");
    const closesAtTimeout = events.length;
    await expect
      .poll(() => events.length, { timeout: 1_000 })
      .toBe(closesAtTimeout);

    await runtime.close();
    expect(closeCalls).toBe(1);
  });

  it.each([
    ["read-only", false],
    ["active", true],
    ["admin", false],
  ] as const)(
    "composes injected active tools safely in %s mode",
    async (mode, exposesActive) => {
      const directory = await mkdtemp(join(tmpdir(), `caido runtime ${mode} `));
      directories.push(directory);
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      const activeTool: ToolDefinition = {
        name: "caido_injected_active",
        description: "Injected active test definition.",
        mode: "active",
        inputSchema: z.strictObject({}),
        outputSchema: z.strictObject({ ok: z.boolean() }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: true,
        },
        handler: async () => ({ ok: true }),
      };
      let activeFactoryCalls = 0;
      const runtime = await createRuntime(
        {
          CAIDO_AGENT_MODE: mode,
          CAIDO_AUDIT_LOG: join(directory, "audit.jsonl"),
          CAIDO_TOKEN_CACHE: join(directory, "tokens.json"),
        },
        {
          stdin: new PassThrough(),
          stdout: new PassThrough(),
          stderr: new PassThrough(),
        },
        {
          createAdapter: () => createTestAdapter(),
          createClient: () => ({}) as never,
          connectClient: async () => undefined,
          createTransport: () => serverTransport,
          createActiveTools: () => {
            activeFactoryCalls += 1;
            return [activeTool];
          },
        },
      );
      const client = new Client({ name: "mode-test", version: "1.0.0" });
      await client.connect(clientTransport);

      const names = (await client.listTools()).tools.map((tool) => tool.name);
      expect(names.includes("caido_injected_active")).toBe(exposesActive);
      expect(activeFactoryCalls).toBe(exposesActive ? 1 : 0);

      await client.close();
      await runtime.close();
    },
  );

  it("attempts every cleanup and resolves closed when cleanup rejects", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido runtime cleanup failure "));
    directories.push(directory);
    const events: string[] = [];
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    const runtime = await createRuntime(
      {
        CAIDO_AUDIT_LOG: join(directory, "audit.jsonl"),
        CAIDO_TOKEN_CACHE: join(directory, "tokens.json"),
      },
      {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
      },
      {
        createAdapter: () =>
          createTestAdapter({
            close: async () => {
              events.push("adapter");
              throw new Error("adapter close failed");
            },
          }),
        createClient: () => ({}) as never,
        connectClient: async () => undefined,
        createTransport: () => serverTransport,
        createAuditLogger: () => ({
          record: async () => undefined,
          flush: async () => {
            events.push("audit-flush");
            throw new Error("audit flush failed");
          },
          close: async () => {
            events.push("audit-close");
          },
        }),
      },
    );

    await expect(runtime.close()).rejects.toThrow("adapter close failed");
    const didResolve = await Promise.race([
      runtime.closed.then(() => true),
      new Promise<false>((resolve) =>
        setTimeout(() => resolve(false), 250).unref(),
      ),
    ]);

    expect(didResolve).toBe(true);
    expect(events).toEqual(["adapter", "audit-flush", "audit-close"]);
  });

  it("fully cleans up and rejects when MCP server connection fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido runtime connect failure "));
    directories.push(directory);
    const signals = new EventEmitter();
    const events: string[] = [];
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    serverTransport.start = async () => {
      throw new Error("server connect failed");
    };

    await expect(
      createRuntime(
        {
          CAIDO_AUDIT_LOG: join(directory, "audit.jsonl"),
          CAIDO_TOKEN_CACHE: join(directory, "tokens.json"),
        },
        {
          stdin: new PassThrough(),
          stdout: new PassThrough(),
          stderr: new PassThrough(),
          signals,
        },
        {
          createAdapter: () =>
            createTestAdapter({
              close: async () => {
                events.push("adapter");
              },
            }),
          createClient: () => ({}) as never,
          connectClient: async () => undefined,
          createTransport: () => serverTransport,
          createAuditLogger: () => ({
            record: async () => undefined,
            flush: async () => {
              events.push("audit-flush");
            },
            close: async () => {
              events.push("audit-close");
            },
          }),
        },
      ),
    ).rejects.toThrow("server connect failed");

    expect(events).toEqual(["adapter", "audit-flush", "audit-close"]);
    expect(signals.listenerCount("SIGINT")).toBe(0);
    expect(signals.listenerCount("SIGTERM")).toBe(0);
  });
});
