import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawn } from "node:child_process";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const script = resolve(root, "scripts/verify-macos-intel.sh");

async function executable(path: string, source: string): Promise<void> {
  await writeFile(path, source, "utf8");
  await chmod(path, 0o755);
}

async function runVerification(
  architecture: "arm64" | "x86_64",
  nodeArchitecture: "arm64" | "x64",
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const directory = await mkdtemp(join(tmpdir(), "caido intel contract "));
  const realNode = process.execPath;
  await executable(
    join(directory, "uname"),
    `#!/bin/sh\nprintf '%s\\n' '${architecture}'\n`,
  );
  await executable(
    join(directory, "node"),
    `#!/bin/sh
if [ "$1" = "-p" ] && [ "$2" = "process.arch" ]; then
  printf '%s\\n' '${nodeArchitecture}'
  exit 0
fi
exec '${realNode}' "$@"
`,
  );

  const child = spawn("bash", [script], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${directory}${delimiter}${process.env.PATH ?? ""}`,
    },
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

describe("macOS Intel verifier", () => {
  it("rejects Apple Silicon without claiming Intel validation", async () => {
    const result = await runVerification("arm64", "x64");

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/arm64[^]*x86_64/is);
    expect(result.stdout).not.toMatch(/verified|terverifikasi/i);
  });

  it("rejects an arm64 Node process on an Intel host", async () => {
    const result = await runVerification("x86_64", "arm64");

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/Node[^]*arm64[^]*x64/is);
    expect(result.stdout).not.toMatch(/verified|terverifikasi/i);
  });

  it("verifies the built stdio server through an absolute path containing spaces", async () => {
    const result = await runVerification("x86_64", "x64");

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/macOS Intel verification passed/i);
    expect(result.stdout).toMatch(/absolute path containing spaces/i);
    expect(result.stdout).toMatch(/stdout contains JSON-RPC frames only/i);
  });
});
