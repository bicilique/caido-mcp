import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  SUPPORTED_CLIENTS,
  renderClientConfig,
} from "../../scripts/onboarding/client-config.js";

const root = resolve(import.meta.dirname, "../..");
const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
const configCli = resolve(root, "scripts/print-client-config.ts");

async function run(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(executable, args, {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  const code = await new Promise<number | null>((resolveExit) => {
    child.once("close", resolveExit);
  });
  return { code, stdout, stderr };
}

describe("client configuration generator", () => {
  it.each(SUPPORTED_CLIENTS)(
    "renders a safe copy-ready %s configuration",
    (client) => {
      const credential = "never-print-this-credential";
      const output = renderClientConfig(client, {
        nodePath: "/Applications/Node 24/bin/node",
        repositoryRoot: "/Users/operator/Caido Agent Kit",
        caidoUrl: "http://127.0.0.1:8080",
      });

      expect(output).toContain(
        "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js",
      );
      expect(output).toContain("read-only");
      expect(output).toContain("CAIDO_PAT");
      expect(output).not.toContain(credential);
    },
  );

  it("rejects an unsupported client with actionable guidance", async () => {
    const result = await run(process.execPath, [tsx, configCli, "windsurf"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("codex");
    expect(result.stderr).toContain("claude");
    expect(result.stderr).toContain("cursor");
  });

  it("does not expose credential values from the environment", async () => {
    const credential = "never-print-this-credential";
    const result = await run(process.execPath, [tsx, configCli, "codex"], {
      ...process.env,
      CAIDO_PAT: credential,
    });

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("CAIDO_PAT");
    expect(result.stdout).not.toContain(credential);
  });
});
