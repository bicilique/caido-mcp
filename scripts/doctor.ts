import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  formatDoctorReport,
  runDiagnostics,
} from "./onboarding/doctor.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
) as { packageManager?: string };

const ownsEnvironmentKey = (name: string): boolean =>
  Object.prototype.hasOwnProperty.call(process.env, name);

const report = await runDiagnostics({
  nodeVersion: process.versions.node,
  platform: process.platform,
  architecture: process.arch,
  packageManager: manifest.packageManager ?? "not configured",
  dependenciesInstalled: existsSync(resolve(repositoryRoot, "node_modules/.pnpm")),
  cliBuilt: existsSync(
    resolve(repositoryRoot, "packages/mcp-server/dist/cli.js"),
  ),
  caidoUrl: process.env.CAIDO_URL ?? "http://127.0.0.1:8080",
  mode: process.env.CAIDO_AGENT_MODE ?? "read-only",
  requireScope: process.env.CAIDO_REQUIRE_SCOPE !== "false",
  credentialPresent:
    ownsEnvironmentKey("CAIDO_PAT") || ownsEnvironmentKey("CAIDO_TOKEN"),
  probeCaido: async (url) => {
    try {
      await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(1_500),
      });
      return true;
    } catch {
      return false;
    }
  },
});

console.log(formatDoctorReport(report));
process.exitCode = report.exitCode;
