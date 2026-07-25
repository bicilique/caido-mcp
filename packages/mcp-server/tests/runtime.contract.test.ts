import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";

import { createRuntime } from "../src/runtime.js";
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
});
