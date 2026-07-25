import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

async function document(path: string): Promise<string> {
  return readFile(resolve(root, path), "utf8");
}

describe("release documentation", () => {
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

    expect(clients).toMatch(/Diverifikasi[^]*2026-07-25/i);
    expect(clients).toContain("Codex CLI");
    expect(clients).toContain("Claude Code");
    expect(clients).toContain("Cursor");
    expect(clients).toContain("/Applications/Node 24/bin/node");
    expect(clients).toContain(
      "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js",
    );
    expect(clients).toMatch(/codex mcp list/);
    expect(clients).toMatch(/claude mcp (list|get)/);
    expect(clients).toMatch(/auto-run[^]*(jangan|tidak)/i);
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
      /otorisasi|authorized use/i,
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
    expect(roadmap).toMatch(/tidak (didaftarkan|tersedia)[^]*tool MCP/i);
  });

  it("records honest Intel and opt-in E2E release evidence", async () => {
    const [intel, release] = await Promise.all([
      document("docs/06-macos-intel-guide.md"),
      document("docs/release-checklist.md"),
    ]);

    expect(intel).toMatch(/uname -m[^]*x86_64/is);
    expect(intel).toMatch(/process\.arch[^]*x64/is);
    expect(intel).toMatch(/arm64[^]*(gagal|ditolak)/i);
    expect(intel).not.toMatch(/Rosetta (?:wajib|diperlukan)/i);
    expect(intel).toMatch(/Rosetta tidak (?:wajib|diperlukan)/i);
    expect(release).toMatch(/arm64[^]*tidak[^]*membuktikan[^]*Intel/is);
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
});
