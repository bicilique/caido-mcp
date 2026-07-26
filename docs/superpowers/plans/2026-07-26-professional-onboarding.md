# Professional Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe, English-first onboarding experience that lets a beginner install, diagnose, configure, and use Caido Agent Kit successfully.

**Architecture:** Keep the existing MCP server and operator skill unchanged. Add two small TypeScript CLIs with injectable pure functions, conventional root commands, and a progressive documentation path from README to tutorial to examples to advanced references.

**Tech Stack:** Node.js 24, TypeScript 7, pnpm 10.28.2, Vitest 4, Make, Markdown

## Global Constraints

- Read-only remains the default operating mode.
- Helpers must not write outside the repository.
- Helpers must never read or print credential values.
- Connection checks are limited to the configured Caido base URL with a short timeout and no target traffic.
- Client configuration is printed for manual review and is never installed automatically.
- Existing lint, type-check, test, coverage, generated-file, security, and build gates must remain green.

---

### Task 1: Safe Client Configuration Generator

**Files:**
- Create: `scripts/onboarding/client-config.ts`
- Create: `scripts/print-client-config.ts`
- Test: `tests/contract/onboarding.contract.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository root, Node executable path, and client name from CLI arguments.
- Produces: `renderClientConfig(client: SupportedClient, context: ConfigContext): string` and `SUPPORTED_CLIENTS`.

- [ ] **Step 1: Write failing configuration tests**

Add table-driven tests for `codex`, `claude`, and `cursor`. Assert that output
contains an absolute `packages/mcp-server/dist/cli.js` path, defaults to
`read-only`, references `CAIDO_PAT`, preserves paths containing spaces, and
does not contain a supplied credential value. Add an unsupported-client CLI
test expecting exit code 1 and the supported names.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `corepack pnpm vitest run --project contract tests/contract/onboarding.contract.test.ts`

Expected: FAIL because `scripts/onboarding/client-config.ts` does not exist.

- [ ] **Step 3: Implement the pure formatter and CLI**

Define:

```ts
export const SUPPORTED_CLIENTS = ["codex", "claude", "cursor"] as const;
export type SupportedClient = (typeof SUPPORTED_CLIENTS)[number];
export interface ConfigContext {
  nodePath: string;
  repositoryRoot: string;
  caidoUrl: string;
}
export function renderClientConfig(
  client: SupportedClient,
  context: ConfigContext,
): string;
```

Serialize TOML-style guidance for Codex, a JSON `.mcp.json` object for Claude,
and a JSON `.cursor/mcp.json` object for Cursor. Reference `CAIDO_PAT` without
reading its value. Make `scripts/print-client-config.ts` validate exactly one
client argument, resolve `process.execPath` and repository root, print the
template to stdout, and send errors to stderr.

- [ ] **Step 4: Add and verify the package command**

Add `"config:client": "tsx scripts/print-client-config.ts"` to `package.json`.

Run: `corepack pnpm config:client codex`

Expected: a copy-ready configuration containing an absolute server path and no
credential value.

- [ ] **Step 5: Run tests and commit**

Run: `corepack pnpm vitest run --project contract tests/contract/onboarding.contract.test.ts`

Commit:

```bash
git add package.json scripts/onboarding/client-config.ts scripts/print-client-config.ts tests/contract/onboarding.contract.test.ts
git commit -m "feat: add safe client configuration generator"
```

### Task 2: Beginner-Friendly Doctor Command

**Files:**
- Create: `scripts/onboarding/doctor.ts`
- Create: `scripts/doctor.ts`
- Modify: `tests/contract/onboarding.contract.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: injected runtime, filesystem, environment-presence, and local fetch data.
- Produces: `runDiagnostics(context: DoctorContext): Promise<DoctorReport>` and formatted pass/warn/fail output.

- [ ] **Step 1: Write failing diagnostic tests**

Cover a healthy environment, missing build output, incompatible Node version,
non-local URL rejection, unreachable local Caido warning, and credential
redaction. The report must contain named checks, remediation text, and an
overall non-zero status only for blocking setup failures.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `corepack pnpm vitest run --project contract tests/contract/onboarding.contract.test.ts`

Expected: FAIL because the doctor module is missing.

- [ ] **Step 3: Implement diagnostics**

Define:

```ts
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
export async function runDiagnostics(
  context: DoctorContext,
): Promise<DoctorReport>;
export function formatDoctorReport(report: DoctorReport): string;
```

Check Node major version 24+, x64 on Darwin, the pinned pnpm declaration,
installed dependencies, built CLI, valid local `CAIDO_URL`, safe mode/scope
defaults, credential presence as a boolean, and local Caido reachability.
Reject non-loopback URLs for the reachability probe. Never interpolate secret
values into a message.

- [ ] **Step 4: Add and exercise the command**

Add `"doctor": "tsx scripts/doctor.ts"` to `package.json`.

Run: `corepack pnpm doctor`

Expected: a readable checklist and specific next steps; lack of a running
Caido instance is a warning rather than a crash.

- [ ] **Step 5: Run tests and commit**

Run: `corepack pnpm vitest run --project contract tests/contract/onboarding.contract.test.ts`

Commit:

```bash
git add package.json scripts/doctor.ts scripts/onboarding/doctor.ts tests/contract/onboarding.contract.test.ts
git commit -m "feat: add guided environment doctor"
```

### Task 3: Conventional Project Entry Points

**Files:**
- Create: `Makefile`
- Modify: `.env.example`
- Modify: `AGENTS.md`
- Modify: `tests/docs/documentation.test.ts`

**Interfaces:**
- Consumes: existing pnpm scripts.
- Produces: `make setup`, `make build`, `make test`, `make lint`, `make doctor`, `make config CLIENT=codex`, and `make verify`.

- [ ] **Step 1: Write failing command-contract tests**

Assert that `Makefile` exposes every required target, each delegates through
Corepack to a documented pnpm command, `.env.example` contains safe read-only
defaults with no credential literal, and `AGENTS.md` documents the actual
TypeScript monorepo commands instead of scaffold-era guidance.

- [ ] **Step 2: Run documentation tests and verify RED**

Run: `corepack pnpm test:docs`

Expected: FAIL because the Makefile and updated repository guidance are absent.

- [ ] **Step 3: Implement conventional entry points**

Use `.PHONY` targets. `setup` runs the frozen install, `config` requires a
`CLIENT` variable and delegates to `config:client`, and no target writes a
secret. Update `.env.example` with commented explanations for each safe
setting. Replace inaccurate scaffold text in `AGENTS.md` with real structure,
test naming, and command guidance.

- [ ] **Step 4: Exercise commands**

Run:

```bash
make doctor
make config CLIENT=cursor
make lint
```

Expected: doctor and config provide useful output; lint passes.

- [ ] **Step 5: Commit**

```bash
git add Makefile .env.example AGENTS.md tests/docs/documentation.test.ts
git commit -m "chore: add conventional project commands"
```

### Task 4: English-First Beginner Documentation

**Files:**
- Modify: `README.md`
- Create: `docs/getting-started.md`
- Create: `docs/examples.md`
- Modify: `docs/00-gap-analysis.md`
- Modify: `docs/01-product-requirements.md`
- Modify: `docs/04-tool-catalog.md`
- Modify: `docs/05-skill-design.md`
- Modify: `docs/06-macos-intel-guide.md`
- Modify: `docs/07-testing-strategy.md`
- Modify: `docs/08-agent-evaluation.md`
- Modify: `docs/09-client-configuration.md`
- Modify: `docs/10-troubleshooting.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/roadmap.md`
- Modify: `tests/docs/documentation.test.ts`

**Interfaces:**
- Consumes: commands from Tasks 1–3 and the existing security model.
- Produces: a linear English onboarding path plus advanced references.

- [ ] **Step 1: Write failing beginner-path documentation contracts**

Require README links to `docs/getting-started.md` and `docs/examples.md`, a
five-command quick start, explanations of Caido/MCP/Skill terminology, doctor
and config commands, at least five sample prompts, expected response sections,
active-mode safety guidance, troubleshooting paths, and valid relative links.
Require core English documents not to use Indonesian section headings.

- [ ] **Step 2: Run documentation tests and verify RED**

Run: `corepack pnpm test:docs`

Expected: FAIL on missing guides and untranslated reference documents.

- [ ] **Step 3: Rewrite the README and add guides**

Lead with the user outcome, add a “Choose your path” section, explain the three
components in plain language, include the shortest verified setup, link the
full tutorial, and retain security/evidence disclosures. In the getting-started
guide, show prerequisites, installation, doctor output interpretation,
client-specific config generation, skill installation, first read-only prompt,
expected response shape, active-mode opt-in, updates, and uninstall steps.

- [ ] **Step 4: Add realistic examples**

Document safe prompts for health, projects/scopes, HTTP history, one request,
response comparison, findings review, HTTPQL repair, and connection
troubleshooting. Each example states prerequisites, expected tool behavior,
sample output structure, and safety limitation without fabricating a live
finding.

- [ ] **Step 5: Translate core references to English**

Preserve technical meaning, commands, evidence dates, and security boundaries.
Keep `README.id.md` and `docs/usage-guide-id.md` as explicitly labeled
Indonesian translations.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
corepack pnpm test:docs
corepack pnpm format:check
```

Commit:

```bash
git add README.md docs tests/docs/documentation.test.ts
git commit -m "docs: add English-first beginner onboarding"
```

### Task 5: Public-Project Governance and Final Verification

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature-request.yml`
- Create: `.github/pull_request_template.md`
- Modify: `README.md`
- Modify: `tests/docs/documentation.test.ts`

**Interfaces:**
- Consumes: repository commands and security reporting policy.
- Produces: clear contribution, issue, and pull-request workflows.

- [ ] **Step 1: Write failing governance contracts**

Assert the README links to contribution, conduct, security, and license files;
templates request reproduction/validation details and prohibit secrets or
live-target data; contribution guidance lists setup, focused tests, complete
verification, generated-file checks, and security boundaries.

- [ ] **Step 2: Run documentation tests and verify RED**

Run: `corepack pnpm test:docs`

Expected: FAIL because governance files are missing.

- [ ] **Step 3: Add governance files**

Write concise, project-specific guidance. Direct vulnerabilities to
`SECURITY.md`; tell users to redact requests, responses, tokens, cookies, and
target identifiers. Use the Contributor Covenant 2.1 text with its attribution
and enforcement contact policy.

- [ ] **Step 4: Run the complete verification pipeline**

Run:

```bash
corepack pnpm format
corepack pnpm verify
bash scripts/verify-macos-intel.sh
git diff --check
```

Expected: all deterministic gates pass. The real-Caido E2E remains opt-in and
must not be claimed as run without operator credentials.

- [ ] **Step 5: Review repository state and commit**

Confirm that `.gitignore` changes predating this work remain preserved and that
no credentials, build artifacts, or caches are staged.

Commit:

```bash
git add CONTRIBUTING.md CODE_OF_CONDUCT.md .github README.md tests/docs/documentation.test.ts
git commit -m "docs: add professional contribution workflows"
```
