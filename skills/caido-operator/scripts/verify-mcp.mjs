#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const server = process.argv[2];
if (server === undefined || !isAbsolute(server)) {
  throw new Error("Usage: verify-mcp.mjs /absolute/path/to/dist/cli.js");
}
const scratch = await mkdtemp(join(tmpdir(), "caido mcp verifier "));
const configuredAuditPath = process.env.CAIDO_AUDIT_LOG;
const configuredTokenPath = process.env.CAIDO_TOKEN_CACHE;
if (
  (configuredAuditPath !== undefined && !isAbsolute(configuredAuditPath)) ||
  (configuredTokenPath !== undefined && !isAbsolute(configuredTokenPath))
) {
  throw new Error("Verifier credential paths must be absolute.");
}
const auditPath = resolve(
  configuredAuditPath ?? join(scratch, "audit path/audit log.jsonl"),
);
const tokenPath = resolve(
  configuredTokenPath ?? join(scratch, "token path/token cache.json"),
);
const sentinel =
  process.env.CAIDO_VERIFY_SENTINEL ||
  ["caido", "verification", "pat", "sentinel"].join("-");
const child = spawn(process.execPath, [server], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    CAIDO_URL: "http://127.0.0.1:1",
    CAIDO_PAT: sentinel,
    CAIDO_REQUEST_TIMEOUT_MS: "20",
    CAIDO_AUDIT_LOG: auditPath,
    CAIDO_TOKEN_CACHE: tokenPath,
  },
  stdio: ["pipe", "pipe", "pipe"],
  shell: false,
});
let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8").on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.setEncoding("utf8").on("data", (chunk) => {
  stderr += chunk;
});

async function waitForExit(timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise((resolveExit) => {
    const finish = (value) => {
      clearTimeout(timeout);
      child.off("close", onClose);
      resolveExit(value);
    };
    const onClose = () => finish(true);
    const timeout = setTimeout(() => finish(false), timeoutMs);
    child.once("close", onClose);
    if (child.exitCode !== null || child.signalCode !== null) finish(true);
  });
}

async function terminate() {
  child.stdin.end();
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  if (await waitForExit(1_000)) return;
  child.kill("SIGKILL");
  if (!(await waitForExit(1_000))) {
    throw new Error("MCP process did not terminate before the hard deadline.");
  }
}

function parsedFrames() {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error("MCP stdout contained a non-JSON line.");
      }
    });
}

async function verify() {
  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "intel-verifier", version: "1.0.0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 3, method: "resources/list", params: {} },
    { jsonrpc: "2.0", id: 4, method: "prompts/list", params: {} },
    {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "caido_health", arguments: {} },
    },
  ];
  child.stdin.write(
    messages.map((message) => JSON.stringify(message)).join("\n") + "\n",
  );

  const responseDeadline = Date.now() + 5_000;
  while (Date.now() < responseDeadline) {
    const ids = new Set(
      parsedFrames()
        .map((frame) => frame.id)
        .filter((id) => typeof id === "number"),
    );
    if ([1, 2, 3, 4, 5].every((id) => ids.has(id))) break;
    if (child.exitCode !== null || child.signalCode !== null) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }

  const frames = parsedFrames();
  const responses = new Map();
  for (const frame of frames) {
    if (
      frame === null ||
      typeof frame !== "object" ||
      frame.jsonrpc !== "2.0"
    ) {
      throw new Error("MCP stdout contained a non-JSON-RPC 2.0 object.");
    }
    if ("id" in frame) {
      if (
        ![1, 2, 3, 4, 5].includes(frame.id) ||
        responses.has(frame.id) ||
        (!("result" in frame) && !("error" in frame))
      ) {
        throw new Error("MCP stdout contained an unexpected response object.");
      }
      responses.set(frame.id, frame);
    } else if (
      typeof frame.method !== "string" ||
      !frame.method.startsWith("notifications/")
    ) {
      throw new Error("MCP stdout contained a diagnostic JSON object.");
    }
  }
  if (![1, 2, 3, 4, 5].every((id) => responses.has(id))) {
    throw new Error(
      `MCP returned too few responses; inspect its ${stderr.length} stderr bytes locally.`,
    );
  }
  if (
    typeof responses.get(1).result?.serverInfo?.name !== "string" ||
    !Array.isArray(responses.get(2).result?.tools) ||
    !Array.isArray(responses.get(3).result?.resources) ||
    !Array.isArray(responses.get(4).result?.prompts) ||
    !Array.isArray(responses.get(5).result?.content) ||
    typeof responses.get(5).result?.structuredContent !== "object"
  ) {
    throw new Error("MCP discovery or health response was malformed.");
  }

  await terminate();
  const realServer = await realpath(server);
  const coreEntrypoint = resolve(
    dirname(realServer),
    "../../core/dist/index.js",
  );
  const { SecureTokenCache } = await import(pathToFileURL(coreEntrypoint).href);
  const cache = new SecureTokenCache(tokenPath);
  await cache.save({
    accessToken: ["verification", "access", "value"].join("-"),
    refreshToken: ["verification", "refresh", "value"].join("-"),
  });

  const [audit, token, auditDirectory, tokenDirectory] = await Promise.all([
    readFile(auditPath, "utf8"),
    readFile(tokenPath, "utf8"),
    stat(dirname(auditPath)),
    stat(dirname(tokenPath)),
  ]);
  const [auditFile, tokenFile] = await Promise.all([
    stat(auditPath),
    stat(tokenPath),
  ]);
  for (const [label, metadata, expected] of [
    ["audit directory", auditDirectory, 0o700],
    ["token directory", tokenDirectory, 0o700],
    ["audit file", auditFile, 0o600],
    ["token file", tokenFile, 0o600],
  ]) {
    if ((metadata.mode & 0o777) !== expected) {
      throw new Error(`${label} permissions were not owner-only.`);
    }
  }
  if (`${stdout}${stderr}${audit}${token}`.includes(sentinel)) {
    throw new Error("Verifier sentinel escaped its credential boundary.");
  }
  console.log(
    `MCP stdio verified (${responses.get(2).result.tools.length} tools, ${responses.get(3).result.resources.length} resources, ${responses.get(4).result.prompts.length} prompts).`,
  );
}

try {
  await verify();
} finally {
  await terminate();
}
