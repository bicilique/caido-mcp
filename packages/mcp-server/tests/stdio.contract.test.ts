import { once } from "node:events";
import {
  lstat,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("stdio entrypoint", () => {
  it("imports the package root without starting stdio", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "caido missing import argv "),
    );
    directories.push(directory);
    const entrypoint = resolve("packages/mcp-server/dist/index.js");
    const missingArgvEntrypoint = join(directory, "missing entrypoint.js");
    const child = spawn(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `await import(${JSON.stringify(pathToFileURL(entrypoint).href)})`,
        missingArgvEntrypoint,
      ],
      {
        env: {
          ...process.env,
          CAIDO_URL: "http://127.0.0.1:1",
          CAIDO_PAT: "caido_test",
          CAIDO_REQUEST_TIMEOUT_MS: "10",
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    child.stdin.end();
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    const exited = once(child, "exit");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5_000);
    timeout.unref();
    const [code, signal] = (await exited) as [
      number | null,
      NodeJS.Signals | null,
    ];
    clearTimeout(timeout);

    expect({ code, signal, stdout, stderr }).toEqual({
      code: 0,
      signal: null,
      stdout: "",
      stderr: "",
    });
  }, 7_000);

  it("starts stdio through an absolute symlink entrypoint containing spaces", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "caido symlink entrypoint with spaces "),
    );
    directories.push(directory);
    const target = resolve("packages/mcp-server/dist/index.js");
    const entrypoint = join(directory, "linked index entrypoint.js");
    await symlink(target, entrypoint);

    expect(isAbsolute(entrypoint)).toBe(true);
    expect(entrypoint).toContain(" ");
    expect((await lstat(entrypoint)).isSymbolicLink()).toBe(true);
    expect(await realpath(entrypoint)).toBe(await realpath(target));

    const child = spawn(process.execPath, [entrypoint], {
      cwd: directory,
      env: {
        ...process.env,
        CAIDO_URL: "http://127.0.0.1:1",
        CAIDO_PAT: "caido_test",
        CAIDO_REQUEST_TIMEOUT_MS: "20",
        CAIDO_AUDIT_LOG: join(directory, "audit log.jsonl"),
        CAIDO_TOKEN_CACHE: join(directory, "token cache.json"),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "symlink-test", version: "1.0.0" },
        },
      })}\n`,
    );

    await expect
      .poll(() => stdout.split("\n").filter(Boolean).length, { timeout: 5_000 })
      .toBeGreaterThanOrEqual(1);
    expect(
      stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((message) => message.id === 1),
    ).toMatchObject({
      jsonrpc: "2.0",
      result: expect.objectContaining({
        serverInfo: { name: "caido-agent-kit", version: "0.1.0" },
      }),
    });

    child.kill("SIGTERM");
    const [code, signal] = (await once(child, "exit")) as [
      number | null,
      NodeJS.Signals | null,
    ];
    expect({ code, signal }).toEqual({ code: 0, signal: null });
  }, 10_000);

  it("uses stdout only for MCP and shuts down cleanly with absolute paths containing spaces", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido stdio with spaces "));
    directories.push(directory);
    const auditPath = join(directory, "audit log.jsonl");
    const tokenPath = join(directory, "token cache.json");
    const entrypoint = resolve("packages/mcp-server/dist/index.js");
    expect(isAbsolute(entrypoint)).toBe(true);

    const child = spawn(process.execPath, [entrypoint], {
      cwd: directory,
      env: {
        ...process.env,
        CAIDO_URL: "http://127.0.0.1:1",
        CAIDO_PAT: "caido_test",
        CAIDO_REQUEST_TIMEOUT_MS: "20",
        CAIDO_AUDIT_LOG: auditPath,
        CAIDO_TOKEN_CACHE: tokenPath,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "stdio-test", version: "1.0.0" },
        },
      })}\n`,
    );
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      })}\n`,
    );
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      })}\n`,
    );
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "caido_health", arguments: {} },
      })}\n`,
    );

    await expect
      .poll(() => stdout.split("\n").filter(Boolean).length, { timeout: 5_000 })
      .toBeGreaterThanOrEqual(3);
    const messages = stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(messages.find((message) => message.id === 1)).toMatchObject({
      jsonrpc: "2.0",
      result: expect.objectContaining({
        serverInfo: { name: "caido-agent-kit", version: "0.1.0" },
      }),
    });
    expect(messages.find((message) => message.id === 2)).toMatchObject({
      result: expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "caido_health" }),
        ]),
      }),
    });
    expect(messages.find((message) => message.id === 3)).toMatchObject({
      result: expect.objectContaining({
        structuredContent: expect.objectContaining({
          ok: true,
          data: { reachable: false, authenticated: false },
        }),
      }),
    });
    expect(stderr).toContain("Caido");

    child.kill("SIGTERM");
    const [code, signal] = (await once(child, "exit")) as [
      number | null,
      NodeJS.Signals | null,
    ];
    expect({ code, signal }).toEqual({ code: 0, signal: null });
    expect(await readFile(auditPath, "utf8")).toContain(
      '"tool":"caido_health"',
    );
  }, 10_000);
});
