export type CheckStatus = "pass" | "warning" | "fail";

export interface DiagnosticCheck {
  name: string;
  status: CheckStatus;
  message: string;
  remediation?: string;
}

export interface DoctorReport {
  checks: DiagnosticCheck[];
  exitCode: 0 | 1;
}

export interface DoctorContext {
  nodeVersion: string;
  platform: NodeJS.Platform;
  architecture: string;
  packageManager: string;
  dependenciesInstalled: boolean;
  cliBuilt: boolean;
  caidoUrl: string;
  mode: string;
  requireScope: boolean;
  credentialPresent: boolean;
  probeCaido: (url: URL) => Promise<boolean>;
}

function check(
  name: string,
  status: CheckStatus,
  message: string,
  remediation?: string,
): DiagnosticCheck {
  return remediation === undefined
    ? { name, status, message }
    : { name, status, message, remediation };
}

function isLocalCaidoUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    const localHosts = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !localHosts.has(url.hostname)
    ) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

export async function runDiagnostics(
  context: DoctorContext,
): Promise<DoctorReport> {
  const checks: DiagnosticCheck[] = [];
  const nodeMajor = Number.parseInt(context.nodeVersion.split(".")[0] ?? "", 10);

  checks.push(
    Number.isInteger(nodeMajor) && nodeMajor >= 24
      ? check("Node.js", "pass", `Node.js ${context.nodeVersion} is supported.`)
      : check(
          "Node.js",
          "fail",
          `Node.js ${context.nodeVersion} is not supported.`,
          "Install Node.js 24 or newer, then run the doctor again.",
        ),
  );

  checks.push(
    context.platform !== "darwin" || context.architecture === "x64"
      ? check(
          "Architecture",
          "pass",
          `${context.platform}/${context.architecture} is usable.`,
        )
      : check(
          "Architecture",
          "fail",
          `${context.platform}/${context.architecture} is not the validated Intel runtime.`,
          "Use an x64 Node.js runtime on Intel macOS.",
        ),
  );

  checks.push(
    context.packageManager === "pnpm@10.28.2"
      ? check("Package manager", "pass", "pnpm 10.28.2 is configured.")
      : check(
          "Package manager",
          "fail",
          `Expected pnpm@10.28.2, found ${context.packageManager}.`,
          "Run corepack enable and use the package manager pinned by package.json.",
        ),
  );

  checks.push(
    context.dependenciesInstalled
      ? check("Dependencies", "pass", "Project dependencies are installed.")
      : check(
          "Dependencies",
          "fail",
          "Project dependencies are missing.",
          "Run corepack pnpm install --frozen-lockfile.",
        ),
  );

  checks.push(
    context.cliBuilt
      ? check("MCP server build", "pass", "The MCP server entry point exists.")
      : check(
          "MCP server build",
          "fail",
          "The MCP server entry point is missing.",
          "Run corepack pnpm build.",
        ),
  );

  checks.push(
    context.mode === "read-only"
      ? check("Operating mode", "pass", "Read-only mode is selected.")
      : check(
          "Operating mode",
          "warning",
          `${context.mode} mode is selected.`,
          "Start with CAIDO_AGENT_MODE=read-only unless active testing is explicitly authorized.",
        ),
  );

  checks.push(
    context.requireScope
      ? check("Scope guard", "pass", "Scope enforcement is enabled.")
      : check(
          "Scope guard",
          "warning",
          "Scope enforcement is disabled.",
          "Set CAIDO_REQUIRE_SCOPE=true before any active operation.",
        ),
  );

  checks.push(
    context.credentialPresent
      ? check("Credential", "pass", "A credential is present in the environment.")
      : check(
          "Credential",
          "warning",
          "No credential is present in the environment.",
          "Provide CAIDO_PAT through your AI client's private environment.",
        ),
  );

  const caidoUrl = isLocalCaidoUrl(context.caidoUrl);
  if (caidoUrl === undefined) {
    checks.push(
      check(
        "Caido URL",
        "fail",
        "CAIDO_URL must be a valid local loopback HTTP or HTTPS URL.",
        "Use a URL such as http://127.0.0.1:8080.",
      ),
    );
  } else {
    checks.push(check("Caido URL", "pass", `${caidoUrl.origin} is local.`));
    const reachable = await context.probeCaido(caidoUrl);
    checks.push(
      reachable
        ? check("Caido connection", "pass", "The local Caido instance responded.")
        : check(
            "Caido connection",
            "warning",
            "The local Caido instance did not respond.",
            "Start Caido, confirm its listener, and check CAIDO_URL.",
          ),
    );
  }

  return {
    checks,
    exitCode: checks.some(({ status }) => status === "fail") ? 1 : 0,
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const label: Record<CheckStatus, string> = {
    pass: "PASS",
    warning: "WARN",
    fail: "FAIL",
  };
  const lines = ["Caido Agent Kit doctor", ""];
  for (const item of report.checks) {
    lines.push(`[${label[item.status]}] ${item.name}: ${item.message}`);
    if (item.remediation !== undefined) {
      lines.push(`       Next: ${item.remediation}`);
    }
  }
  lines.push(
    "",
    report.exitCode === 0
      ? "Ready. Resolve any warnings before relying on the integration."
      : "Setup is incomplete. Resolve the failed checks and run pnpm doctor again.",
  );
  return lines.join("\n");
}
