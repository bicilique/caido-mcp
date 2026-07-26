import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

async function document(path: string): Promise<string> {
  return readFile(resolve(root, path), "utf8");
}

describe("release documentation", () => {
  it("presents the security-first landing page and protects repository evidence", async () => {
    const readme = await readFile(join(root, "README.md"), "utf8");

    expect(readme).toContain(
      "https://github.com/bicilique/caido-mcp/actions/workflows/ci.yml",
    );
    expect(readme).toMatch(/## Security posture/i);
    expect(readme).toMatch(/## Architecture/i);
    expect(readme).toContain("```mermaid");
    expect(readme).toMatch(/## Operating modes/i);
    expect(readme).toMatch(/## Quick start/i);
    expect(readme).toMatch(/## Verification evidence/i);
    expect(readme).toMatch(/real-Caido E2E/i);
    expect(readme).toContain("README.id.md");

    const gitignore = await readFile(join(root, ".gitignore"), "utf8");

    for (const rule of [
      ".env*",
      "!.env.example",
      ".idea/",
      ".vscode/",
      ".pnpm-store/",
      "*.tsbuildinfo",
      ".caido-agent/",
      "*.swp",
      "*~",
    ]) {
      expect(gitignore).toContain(rule);
    }

    for (const trackedPath of [
      "README.md",
      "README.id.md",
      "packages/core/src/config.ts",
      "tests/docs/documentation.test.ts",
      "docs/02-architecture.md",
      ".env.example",
      "docs/release-checklist.md",
      "pnpm-lock.yaml",
      ".github/workflows/ci.yml",
      "skills/caido-operator/references/tool-selection.md",
    ]) {
      const result = spawnSync(
        "git",
        ["check-ignore", "--no-index", "-q", trackedPath],
        {
          cwd: root,
        },
      );
      expect(result.status).toBe(1);
    }
  });

  it("provides the complete numbered documentation set and release records", async () => {
    const required = [
      "README.md",
      "README.id.md",
      "LICENSE",
      "SECURITY.md",
      "CHANGELOG.md",
      ...Array.from(
        { length: 11 },
        (_, index) => `docs/${String(index).padStart(2, "0")}-`,
      ),
      "docs/roadmap.md",
      "docs/release-checklist.md",
    ];
    const paths = await Promise.all(
      required.map(async (path) => {
        if (path.endsWith("-")) {
          const candidates = [
            "gap-analysis",
            "product-requirements",
            "architecture",
            "threat-model",
            "tool-catalog",
            "skill-design",
            "macos-intel-guide",
            "testing-strategy",
            "agent-evaluation",
            "client-configuration",
            "troubleshooting",
          ];
          return document(`${path}${candidates[Number(path.slice(5, 7))]}.md`);
        }
        return document(path);
      }),
    );

    expect(paths.every((content) => content.trim().length > 0)).toBe(true);
  });

  it("contains a complete Bahasa Indonesia operator guide", async () => {
    const readme = await document("README.id.md");

    for (const heading of [
      "Tentang Proyek",
      "Prasyarat",
      "macOS Intel",
      "Autentikasi",
      "Menjalankan Server MCP",
      "Memasang Skill",
      "Mode Read-Only dan Active",
      "Peringatan Keamanan",
      "Lima Prompt Aman Pertama",
      "Pemecahan Masalah",
      "Menghapus Instalasi dan Kredensial",
    ]) {
      expect(readme, heading).toMatch(new RegExp(`^## ${heading}$`, "m"));
    }
    expect(readme).toMatch(/Caido sudah (terpasang|diinstal)/i);
    expect(readme).toMatch(/Skill[^]*penalaran[^]*MCP[^]*eksekusi/i);
  });

  it("documents dated, official client configurations with safe absolute paths", async () => {
    const clients = await document("docs/09-client-configuration.md");

    expect(clients).toMatch(/Verified[^]*2026-07-25/i);
    expect(clients).toContain("Codex CLI");
    expect(clients).toContain("Claude Code");
    expect(clients).toContain("Cursor");
    expect(clients).toContain("/Applications/Node 24/bin/node");
    expect(clients).toContain(
      "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js",
    );
    expect(clients).toMatch(/codex mcp list/);
    expect(clients).toMatch(/claude mcp (list|get)/);
    expect(clients).toMatch(/(?:do not|never)[^]*auto-run/i);
    expect(clients).toMatch(/stdout[^]*JSON-RPC[^]*stderr/is);
  });

  it("documents credential cleanup, security boundaries, and deferred-only capabilities", async () => {
    const [readme, security, threatModel, roadmap] = await Promise.all([
      document("README.id.md"),
      document("SECURITY.md"),
      document("docs/03-threat-model.md"),
      document("docs/roadmap.md"),
    ]);

    expect(readme).toMatch(/CAIDO_TOKEN_CACHE[^]*(hapus|remove)/i);
    for (const topic of [
      /otorisasi|authorized[- ]use/i,
      /prompt injection/i,
      /redaksi|redaction/i,
      /scope/i,
      /active mode/i,
      /audit/i,
      /lapor|report/i,
      /keterbatasan|limitation/i,
    ]) {
      expect(`${security}\n${threatModel}`).toMatch(topic);
    }
    for (const deferred of [
      "deleting projects",
      "deleting scopes",
      "deleting findings",
      "dropping intercepted requests",
      "high-volume fuzzing",
      "active scanning",
      "race-condition",
      "out-of-scope overrides",
      "arbitrary plugin RPC",
      "arbitrary GraphQL",
      "remote internet-exposed MCP transport",
    ]) {
      expect(roadmap.toLowerCase()).toContain(deferred.toLowerCase());
    }
    expect(roadmap).toMatch(/not (?:registered|available)[^]*MCP tools?/i);
  });

  it("records honest Intel and opt-in E2E release evidence", async () => {
    const [intel, release] = await Promise.all([
      document("docs/06-macos-intel-guide.md"),
      document("docs/release-checklist.md"),
    ]);

    expect(intel).toMatch(/uname -m[^]*x86_64/is);
    expect(intel).toMatch(/process\.arch[^]*x64/is);
    expect(intel).toMatch(/arm64[^]*(?:fails|rejected)/i);
    expect(intel).toMatch(/Rosetta is[^]*not[^]*required/i);
    expect(release).toMatch(/arm64[^]*does not[^]*prove[^]*Intel/is);
    expect(release).toContain(
      "CAIDO_E2E=1 CAIDO_AGENT_MODE=active CAIDO_PAT='<operator-supplied>' corepack pnpm test:e2e",
    );
  });

  it("exposes every root command and composes every non-optional release gate", async () => {
    const manifest = JSON.parse(await document("package.json")) as {
      scripts: Record<string, string>;
    };
    const required = [
      "lint",
      "typecheck",
      "test:unit",
      "test:contract",
      "test:integration",
      "test:e2e",
      "test:skill",
      "eval:skill",
      "test:docs",
      "build",
      "coverage",
      "verify",
    ];
    for (const name of required) {
      expect(manifest.scripts[name], name).toBeTypeOf("string");
    }
    for (const gate of [
      "format:check",
      "lint",
      "typecheck",
      "test:unit",
      "test:contract",
      "test:integration",
      "test:skill",
      "eval:skill",
      "test:docs",
      "check:generated",
      "coverage",
      "build",
      "audit:high",
      "scan:secrets",
      "license:inventory",
    ]) {
      expect(manifest.scripts.verify, gate).toContain(gate);
    }
    expect(manifest.scripts.verify).not.toContain("test:e2e");
  });

  it("uses only official major-pinned actions and all deterministic CI gates", async () => {
    const workflow = await document(".github/workflows/ci.yml");

    expect(workflow).toContain("--frozen-lockfile");
    expect(workflow).toMatch(/actions\/checkout@v\d+/);
    expect(workflow).toMatch(/actions\/setup-node@v\d+/);
    expect(workflow).not.toMatch(/uses:\s*(?!actions\/)[^ \n]+/);
    expect(workflow.indexOf("pnpm build")).toBeLessThan(
      workflow.indexOf("pnpm test:contract"),
    );
    for (const command of [
      "format:check",
      "lint",
      "typecheck",
      "test:unit",
      "test:contract",
      "test:integration",
      "test:skill",
      "eval:skill",
      "test:docs",
      "check:generated",
      "coverage",
      "build",
      "audit:high",
      "scan:secrets",
      "license:inventory",
    ]) {
      expect(workflow, command).toContain(`pnpm ${command}`);
    }
  });

  it("formats production, tests, configuration, and documentation repository-wide", async () => {
    const [manifestText, ignored] = await Promise.all([
      document("package.json"),
      document(".prettierignore"),
    ]);
    const manifest = JSON.parse(manifestText) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts.format).toBe("prettier --write .");
    expect(manifest.scripts["format:check"]).toBe("prettier --check .");
    expect(ignored).toMatch(/node_modules/);
    expect(ignored).toMatch(/dist/);
    expect(ignored).toMatch(/coverage/);
    expect(ignored).toMatch(/pnpm-lock\.yaml/);
    expect(ignored).not.toMatch(/^packages\/?$/m);
    expect(ignored).not.toMatch(/^tests\/?$/m);
    expect(ignored).not.toMatch(/^docs\/?$/m);
  });

  it("provides conventional beginner-friendly project commands", async () => {
    const [makefile, environment, agents] = await Promise.all([
      document("Makefile"),
      document(".env.example"),
      document("AGENTS.md"),
    ]);

    for (const target of [
      "setup",
      "build",
      "test",
      "lint",
      "doctor",
      "config",
      "verify",
    ]) {
      expect(makefile).toMatch(new RegExp(`^${target}:`, "m"));
    }
    expect(makefile).toContain("corepack pnpm install --frozen-lockfile");
    expect(makefile).toContain("corepack pnpm run doctor");
    expect(makefile).toContain("config:client $(CLIENT)");
    expect(environment).toContain("CAIDO_AGENT_MODE=read-only");
    expect(environment).toContain("CAIDO_REQUIRE_SCOPE=true");
    expect(environment).not.toMatch(/^CAIDO_(?:PAT|TOKEN)=.+$/m);
    expect(agents).toContain("packages/core");
    expect(agents).toContain("packages/mcp-server");
    expect(agents).toContain("corepack pnpm verify");
    expect(agents).not.toMatch(/minimal scaffold/i);
  });

  it("provides a complete English-first beginner path with safe examples", async () => {
    const [readme, gettingStarted, examples] = await Promise.all([
      document("README.md"),
      document("docs/getting-started.md"),
      document("docs/examples.md"),
    ]);

    expect(readme).toContain("docs/getting-started.md");
    expect(readme).toContain("docs/examples.md");
    expect(readme).toMatch(/What are Caido, MCP, and a Skill\?/i);
    expect(readme).toContain("make doctor");
    expect(readme).toContain("make config CLIENT=codex");
    for (const command of ["make setup", "make build", "make doctor"]) {
      expect(`${readme}\n${gettingStarted}`).toContain(command);
    }
    for (const heading of [
      "Before You Begin",
      "Install and Build",
      "Run the Doctor",
      "Connect Your AI Client",
      "Your First Read-Only Task",
      "Active Mode",
      "Update",
      "Uninstall",
    ]) {
      expect(gettingStarted, heading).toMatch(
        new RegExp(`^## ${heading}$`, "m"),
      );
    }
    expect(
      examples.match(/^## Example \d+:/gm)?.length ?? 0,
    ).toBeGreaterThanOrEqual(5);
    expect(examples).toContain("Objective:");
    expect(examples).toContain("Evidence:");
    expect(examples).toContain("Limitations:");
    expect(`${readme}\n${gettingStarted}\n${examples}`).toMatch(
      /explicit authorization/i,
    );
  });

  it("keeps core references in English and all onboarding links valid", async () => {
    const englishReferences = [
      "docs/00-gap-analysis.md",
      "docs/01-product-requirements.md",
      "docs/04-tool-catalog.md",
      "docs/05-skill-design.md",
      "docs/06-macos-intel-guide.md",
      "docs/07-testing-strategy.md",
      "docs/08-agent-evaluation.md",
      "docs/09-client-configuration.md",
      "docs/10-troubleshooting.md",
      "docs/release-checklist.md",
      "docs/roadmap.md",
    ];
    for (const path of englishReferences) {
      const content = await document(path);
      expect(content, path).not.toMatch(
        /^# (?:Analisis|Persyaratan|Katalog|Desain|Panduan|Strategi|Evaluasi|Konfigurasi|Pemecahan|Checklist)/m,
      );
    }

    for (const path of [
      "README.md",
      "docs/getting-started.md",
      "docs/examples.md",
    ]) {
      const content = await document(path);
      const links = [
        ...content.matchAll(/\]\((?!https?:)([^)#]+\.md)(?:#[^)]+)?\)/g),
      ];
      for (const match of links) {
        const target = match[1];
        expect(target, `link in ${path}`).toBeDefined();
        await expect(
          access(resolve(root, dirname(path), target as string)),
        ).resolves.toBeUndefined();
      }
    }
  });

  it("provides safe public contribution and review workflows", async () => {
    const [readme, contributing, conduct, bug, feature, pullRequest] =
      await Promise.all([
        document("README.md"),
        document("CONTRIBUTING.md"),
        document("CODE_OF_CONDUCT.md"),
        document(".github/ISSUE_TEMPLATE/bug-report.yml"),
        document(".github/ISSUE_TEMPLATE/feature-request.yml"),
        document(".github/pull_request_template.md"),
      ]);

    for (const path of [
      "CONTRIBUTING.md",
      "CODE_OF_CONDUCT.md",
      "SECURITY.md",
      "LICENSE",
    ]) {
      expect(readme).toContain(`](${path})`);
    }
    for (const command of [
      "make setup",
      "corepack pnpm test:unit",
      "corepack pnpm check:generated",
      "corepack pnpm verify",
    ]) {
      expect(contributing).toContain(command);
    }
    expect(conduct).toMatch(/Contributor Covenant[^]*2\.1/i);
    expect(`${bug}\n${feature}\n${pullRequest}`).toMatch(
      /do not include[^]*(?:credential|secret)/i,
    );
    expect(bug).toMatch(/reproduction/i);
    expect(pullRequest).toMatch(/validation/i);
    expect(feature).toMatch(/security/i);
  });
});
