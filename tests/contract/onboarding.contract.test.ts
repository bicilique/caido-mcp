import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  SUPPORTED_CLIENTS,
  renderClientConfig,
} from "../../scripts/onboarding/client-config.js";
import {
  formatDoctorReport,
  runDiagnostics,
  type DoctorContext,
} from "../../scripts/onboarding/doctor.js";

const root = resolve(import.meta.dirname, "../..");
const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
const configCli = resolve(root, "scripts/print-client-config.ts");

function healthyDoctorContext(
  overrides: Partial<DoctorContext> = {},
): DoctorContext {
  return {
    nodeVersion: "24.18.0",
    platform: "darwin",
    architecture: "x64",
    packageManager: "pnpm@10.28.2",
    dependenciesInstalled: true,
    cliBuilt: true,
    caidoUrl: "http://127.0.0.1:8080",
    mode: "read-only",
    requireScope: true,
    credentialPresent: true,
    probeCaido: async () => true,
    ...overrides,
  };
}

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

describe("onboarding doctor", () => {
  it("passes a healthy supported environment", async () => {
    const report = await runDiagnostics(healthyDoctorContext());

    expect(report.exitCode).toBe(0);
    expect(report.checks.some((check) => check.status === "fail")).toBe(false);
    expect(formatDoctorReport(report)).toMatch(/ready/i);
  });

  it("fails with a build command when the server output is missing", async () => {
    const report = await runDiagnostics(
      healthyDoctorContext({ cliBuilt: false }),
    );

    expect(report.exitCode).toBe(1);
    expect(formatDoctorReport(report)).toMatch(/pnpm build/i);
  });

  it("fails clearly on an incompatible Node version", async () => {
    const report = await runDiagnostics(
      healthyDoctorContext({ nodeVersion: "22.20.0" }),
    );

    expect(report.exitCode).toBe(1);
    expect(formatDoctorReport(report)).toMatch(/Node\.js 24/i);
  });

  it("refuses to probe a non-local Caido URL", async () => {
    let probes = 0;
    const report = await runDiagnostics(
      healthyDoctorContext({
        caidoUrl: "https://example.com",
        probeCaido: async () => {
          probes += 1;
          return true;
        },
      }),
    );

    expect(report.exitCode).toBe(1);
    expect(probes).toBe(0);
    expect(formatDoctorReport(report)).toMatch(/local|loopback/i);
  });

  it("reports an unreachable local Caido instance as a warning", async () => {
    const report = await runDiagnostics(
      healthyDoctorContext({ probeCaido: async () => false }),
    );

    expect(report.exitCode).toBe(0);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "Caido connection", status: "warning" }),
    );
  });

  it("never includes credential values in formatted output", async () => {
    const credential = "never-print-this-credential";
    const report = await runDiagnostics(
      healthyDoctorContext({ credentialPresent: credential.length > 0 }),
    );

    const output = formatDoctorReport(report);
    expect(output).toMatch(/credential.*present/i);
    expect(output).not.toContain(credential);
  });
});
