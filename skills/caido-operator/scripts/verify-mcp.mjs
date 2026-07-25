#!/usr/bin/env node
import { spawn } from "node:child_process";
import { isAbsolute } from "node:path";

const server = process.argv[2];
if (server === undefined || !isAbsolute(server)) {
  throw new Error("Usage: verify-mcp.mjs /absolute/path/to/dist/cli.js");
}
const child = spawn(process.execPath, [server], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    CAIDO_URL: "http://127.0.0.1:1",
    CAIDO_PAT: "caido_test",
    CAIDO_REQUEST_TIMEOUT_MS: "20",
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
];
child.stdin.end(
  messages.map((message) => JSON.stringify(message)).join("\n") + "\n",
);

const deadline = Date.now() + 5_000;
while (stdout.split("\n").filter(Boolean).length < 2 && Date.now() < deadline) {
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
}
child.kill("SIGTERM");
await new Promise((resolveExit) => child.once("close", resolveExit));

const frames = stdout.split("\n").filter(Boolean);
if (frames.length < 2) {
  throw new Error(
    `MCP returned too few frames; inspect its ${stderr.length} stderr bytes locally.`,
  );
}
for (const frame of frames) JSON.parse(frame);
const initialized = JSON.parse(frames[0]);
const listed = JSON.parse(frames[1]);
if (
  initialized.id !== 1 ||
  listed.id !== 2 ||
  !Array.isArray(listed.result?.tools)
) {
  throw new Error("MCP initialize/tools-list response was malformed.");
}
console.log(`MCP stdio verified (${listed.result.tools.length} tools).`);
