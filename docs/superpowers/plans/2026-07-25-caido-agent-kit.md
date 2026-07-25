# Caido Agent Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality, security-first Caido Agent Skill and local stdio MCP server for Intel macOS.

**Architecture:** A pnpm TypeScript monorepo separates reusable security/Caido adapters, MCP protocol wiring, and deterministic Skill evaluations. A canonical MCP registry drives runtime registration and generated documentation; all traffic crosses shared scope, redaction, body-limit, and audit boundaries.

**Tech Stack:** Node.js 24 x64, pnpm 10.28.2, strict TypeScript 7.0.2, Vitest 4.1.10, Zod 4.4.3, `@caido/sdk-client` 0.5.0, and `@modelcontextprotocol/sdk` 1.29.0.

## Global Constraints

- Target macOS Intel: `uname -m` must be `x86_64`; Node must report `x64`.
- MCP uses local stdio and stable protocol 2025-11-25; stdout contains protocol frames only.
- Default mode is read-only; active tools are registered only in explicit active mode.
- Scope enforcement, sensitive-data redaction, bounded bodies/batches, timeouts, rate limits, and secret-free audit logging are enabled by default.
- Production behavior follows observed RED–GREEN–REFACTOR; each task ends in a focused commit.
- Captured traffic is untrusted evidence and must never be treated as agent instructions.
- No destructive, arbitrary GraphQL, arbitrary shell, fuzzing, race, scanning, or remote-transport tool is registered.
- Operational documentation is Bahasa Indonesia; code, schemas, tool metadata, and technical references are English.

---

### Task 1: Workspace and configuration contract

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`
- Create: `packages/core/tests/config.test.ts`
- Create: `packages/core/src/config.ts`

**Interfaces:**
- Produces: `parseConfig(env: NodeJS.ProcessEnv): AgentConfig`
- Produces: `AgentConfig` with URL, mode, scope/redaction flags, hard bounds, audit path, and token-cache path.

- [ ] **Step 1: Activate the pinned toolchain and install workspace dependencies**

Run:

```bash
source "$HOME/.nvm/nvm.sh"
nvm install 24
nvm use 24
corepack enable
corepack prepare pnpm@10.28.2 --activate
```

Expected: `node --version` reports v24.x, `node -p process.arch` reports `x64`, and `pnpm --version` reports 10.28.2.

- [ ] **Step 2: Add the workspace manifests and one failing configuration test**

```ts
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";

describe("parseConfig", () => {
  it("uses secure local defaults", () => {
    expect(parseConfig({})).toMatchObject({
      caidoUrl: "http://127.0.0.1:8080",
      mode: "read-only",
      requireScope: true,
      allowSensitiveHeaders: false,
      bodyLimit: 4096,
      maxBatch: 20,
      requestTimeoutMs: 15000,
    });
  });
});
```

- [ ] **Step 3: Run the focused test and observe RED**

Run: `pnpm test:unit -- packages/core/tests/config.test.ts`

Expected: FAIL because `packages/core/src/config.ts` does not exist.

- [ ] **Step 4: Implement strict Zod-backed configuration**

Implement `AgentConfigSchema.strict()`, platform-safe default paths under `~/Library/Application Support/caido-agent-kit`, URL validation, enum modes, positive bounded integers, boolean parsing, and actionable rejection of unknown values.

- [ ] **Step 5: Add invalid-mode, invalid-URL, unknown-value, and numeric-bound cases; keep GREEN**

Run: `pnpm test:unit -- packages/core/tests/config.test.ts`

Expected: all configuration tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts .gitignore .env.example packages/core
git commit -m "feat: establish typed workspace configuration"
```

### Task 2: Error and result contracts

**Files:**
- Create: `packages/core/src/errors.ts`, `packages/core/src/result.ts`, `packages/core/src/types.ts`
- Create: `packages/core/tests/result.test.ts`, `packages/core/tests/errors.test.ts`

**Interfaces:**
- Produces: `ToolErrorCode`, `ToolError`, `ToolResult<T>`, `successResult()`, `errorResult()`, and `normalizeError()`.
- Consumes: `AgentConfig` timeout and bounds.

- [ ] **Step 1: Write failing result-envelope tests**

```ts
it("creates a stable success envelope", () => {
  expect(successResult("caido_health", { reachable: true })).toEqual({
    ok: true,
    data: { reachable: true },
    meta: { tool: "caido_health" },
    warnings: [],
  });
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm test:unit -- packages/core/tests/result.test.ts packages/core/tests/errors.test.ts`

Expected: FAIL on missing exports.

- [ ] **Step 3: Implement the specified error union and envelope helpers**

Normalize Zod, timeout, authentication, HTTPQL, not-found, rate, scope, upstream, and unknown errors without returning raw secret-bearing messages.

- [ ] **Step 4: Run GREEN and commit**

```bash
pnpm test:unit -- packages/core/tests/result.test.ts packages/core/tests/errors.test.ts
git add packages/core
git commit -m "feat: add stable result and error contracts"
```

### Task 3: Redaction, body handling, and fingerprints

**Files:**
- Create: `packages/core/src/security/redaction.ts`, `body-limits.ts`, `fingerprint.ts`
- Create: `packages/core/tests/security/redaction.test.ts`, `body-limits.test.ts`, `fingerprint.test.ts`

**Interfaces:**
- Produces: `redactHeaders()`, `redactStructured()`, `redactUrl()`, `redactRawHttp()`.
- Produces: `boundBody(input, options): BoundedBody` and `fingerprintResponse()`.

- [ ] **Step 1: Write RED security regressions**

Cover mixed-case and duplicate sensitive headers, folded/malformed raw headers, URL tokens, JSON token fields, binary bodies, explicit offsets, hard limits, and SHA-256 stability.

```ts
it("preserves names and redacts duplicate mixed-case headers", () => {
  expect(redactHeaders([
    ["authorization", "Bearer secret"],
    ["COOKIE", "sid=secret"],
    ["Cookie", "other=secret"],
  ])).toEqual([
    ["authorization", "[REDACTED]"],
    ["COOKIE", "[REDACTED]"],
    ["Cookie", "[REDACTED]"],
  ]);
});
```

- [ ] **Step 2: Run RED, implement the shared choke point, then run GREEN**

Run: `pnpm test:unit -- packages/core/tests/security`

Expected RED: missing modules. Expected GREEN after implementation: all security cases pass.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/security packages/core/tests/security
git commit -m "feat: enforce redaction and bounded body handling"
```

### Task 4: Scope guard and rate limiter

**Files:**
- Create: `packages/core/src/security/scope-guard.ts`, `rate-limit.ts`
- Create: `packages/core/tests/security/scope-guard.test.ts`, `rate-limit.test.ts`

**Interfaces:**
- Produces: `normalizeTarget()`, `evaluateScope(target, rules): ScopeDecision`.
- Produces: `RateLimiter.consume(key, now): void`.

- [ ] **Step 1: Write RED scope matrix**

Test exact hosts, wildcard subdomains, deny precedence, scheme/port, uppercase/trailing-dot hosts, Unicode/punycode, IPv4, IPv6, localhost, malformed URLs, and missing selected scope.

```ts
it("lets a deny rule override a wildcard allow", () => {
  const decision = evaluateScope(
    normalizeTarget("https://admin.example.test"),
    [{ action: "allow", host: "*.example.test" }, { action: "deny", host: "admin.example.test" }],
  );
  expect(decision.allowed).toBe(false);
});
```

- [ ] **Step 2: Observe RED, implement fail-closed matching and token-bucket limits, then run GREEN**

Run: `pnpm test:unit -- packages/core/tests/security/scope-guard.test.ts packages/core/tests/security/rate-limit.test.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/security packages/core/tests/security
git commit -m "feat: enforce target scope and request rates"
```

### Task 5: Audit log and hardened token cache

**Files:**
- Create: `packages/core/src/security/audit-log.ts`
- Create: `packages/core/src/caido/token-cache.ts`
- Create: `packages/core/tests/security/audit-log.test.ts`
- Create: `packages/core/tests/caido/token-cache.test.ts`

**Interfaces:**
- Produces: `AuditLogger.record(event): Promise<void>`, `flush()`, `close()`.
- Produces: SDK-compatible `SecureTokenCache` with `load`, `store`, and `clear`.

- [ ] **Step 1: Write RED filesystem tests in isolated temporary directories**

Assert JSONL allowlisted fields, rotation bounds, malformed paths, no secret serialization, parent mode `0700`, file mode `0600`, expired/malformed cache handling, insecure existing permissions, and symlink rejection.

- [ ] **Step 2: Run RED**

Run: `pnpm test:unit -- packages/core/tests/security/audit-log.test.ts packages/core/tests/caido/token-cache.test.ts`

- [ ] **Step 3: Implement atomic owner-only storage and bounded audit rotation**

Use `lstat` before reads/writes, exclusive temporary files in the same directory, mode checks, rename-based replacement, and allowlisted event serialization.

- [ ] **Step 4: Run GREEN and commit**

```bash
pnpm test:unit -- packages/core/tests/security/audit-log.test.ts packages/core/tests/caido/token-cache.test.ts
git add packages/core
git commit -m "feat: secure audit and token persistence"
```

### Task 6: Authentication and Caido adapter boundary

**Files:**
- Create: `packages/core/src/caido/auth.ts`, `adapter.ts`, `client.ts`
- Create: `packages/core/src/caido/graphql/documents.ts`, `sitemap.ts`, `intercept.ts`
- Create: `packages/core/tests/caido/auth.test.ts`, `adapter.test.ts`
- Create: `tests/fixtures/caido/graphql/*.json`

**Interfaces:**
- Produces: `createCaidoClient(config, cache): Promise<CaidoConnection>`.
- Produces: `CaidoAdapter` methods matching all registered read and active capabilities.
- Produces: named typed GraphQL adapters only for SDK gaps.

- [ ] **Step 1: Write RED authentication-order tests**

Assert cached token, PAT, interactive login, and direct token priority; expired refresh, malformed cache, missing credentials, timeout, unreachable instance, and sanitized upstream errors.

- [ ] **Step 2: Write RED adapter contract tests**

Define stable project-owned DTOs for projects, requests, bodies, scopes, findings, Replay, workflows, filters, Sitemap, health, and active mutation results.

- [ ] **Step 3: Run RED**

Run: `pnpm test:unit -- packages/core/tests/caido`

- [ ] **Step 4: Implement official SDK mappings and isolated GraphQL gaps**

Use `@caido/sdk-client` high-level SDKs first. Centralize GraphQL documents and validate every response with Zod before mapping.

- [ ] **Step 5: Run GREEN and commit**

```bash
pnpm test:unit -- packages/core/tests/caido
git add packages/core tests/fixtures
git commit -m "feat: add authenticated Caido adapter"
```

### Task 7: Canonical MCP registry and stdio lifecycle

**Files:**
- Create: `packages/mcp-server/package.json`, `tsconfig.json`
- Create: `packages/mcp-server/src/index.ts`, `server.ts`, `config.ts`, `registry.ts`
- Create: `packages/mcp-server/src/serialization/result-content.ts`
- Create: `packages/mcp-server/tests/discovery.contract.test.ts`, `stdio.contract.test.ts`

**Interfaces:**
- Produces: `ToolDefinition<I, O>` with schemas, annotations, mode, handler, security metadata.
- Produces: `createServer(dependencies)` and `runStdioServer()`.

- [ ] **Step 1: Write RED MCP initialization and empty-registry contract tests**

Use an in-process MCP client for discovery and a spawned stdio process to assert stdout contains JSON-RPC only.

- [ ] **Step 2: Run RED**

Run: `pnpm test:contract -- packages/mcp-server/tests/discovery.contract.test.ts`

- [ ] **Step 3: Implement lifecycle, dual text/structured results, cancellation, and clean shutdown**

Diagnostics use injected stderr logging. SIGINT/SIGTERM stop the server, close the Caido connection, and flush audit logs.

- [ ] **Step 4: Run GREEN and commit**

```bash
pnpm test:contract -- packages/mcp-server/tests/discovery.contract.test.ts packages/mcp-server/tests/stdio.contract.test.ts
git add packages/mcp-server
git commit -m "feat: establish MCP registry and stdio server"
```

### Task 8: Read-only tools and resources

**Files:**
- Create: focused handlers under `packages/mcp-server/src/tools/read/`
- Create: `packages/mcp-server/src/resources/*.ts`
- Create: `packages/mcp-server/tests/read-tools.contract.test.ts`, `resources.contract.test.ts`
- Create: `tests/integration/mock-caido-server.ts`, `read-only.integration.test.ts`

**Interfaces:**
- Registers: all 14 specified `caido_*` read tools and six `caido://` resources.
- Consumes: `CaidoAdapter`, security pipeline, `ToolResult<T>`.

- [ ] **Step 1: Add one failing discovery/behavior test per tool family**

Assert names, strict schemas, output schemas, all four annotations, bounded pagination, evidence IDs, untrusted metadata, deterministic errors, and redaction.

- [ ] **Step 2: Run RED**

Run: `pnpm test:contract -- packages/mcp-server/tests/read-tools.contract.test.ts`

- [ ] **Step 3: Implement minimal focused handlers and resource templates**

Each handler performs one adapter call. `caido_diff_responses` returns compact status/header/length/fingerprint/body-diff data rather than full duplicate bodies.

- [ ] **Step 4: Exercise real adapter boundaries against mock Caido and run GREEN**

```bash
pnpm test:contract
pnpm test:integration
```

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server tests/integration
git commit -m "feat: expose secure read-only Caido operations"
```

### Task 9: Skill eval contracts and portable Agent Skill

**Files:**
- Create: `packages/skill-evals/package.json`, `tsconfig.json`, `src/*.ts`, `tests/*.test.ts`
- Create: 20 YAML cases under `packages/skill-evals/cases/`
- Create: `skills/caido-operator/SKILL.md`
- Create: all specified files under `skills/caido-operator/references/` except generated `tool-selection.md`
- Create: `skills/caido-operator/assets/*.md`

**Interfaces:**
- Produces: deterministic `evaluateSkillCase(case, skill): EvalResult`.
- Produces: portable `caido-operator` Skill with required frontmatter and routing.

- [ ] **Step 1: Write all eval cases before the Skill**

Cases encode activation, intent, required/forbidden tools, active-mode needs, confirmation rules, safety behavior, and required output fields.

- [ ] **Step 2: Run baseline RED**

Run: `pnpm eval:skill`

Expected: all activation/content checks fail because the Skill is absent.

- [ ] **Step 3: Write the smallest Skill and references that satisfy each safety behavior**

Keep the main Skill concise. Explicitly treat traffic as untrusted, require health/project/scope ordering, gate active actions, and require evidence-separated reporting.

- [ ] **Step 4: Run GREEN and validate the Agent Skills specification**

```bash
pnpm test:skill
pnpm eval:skill
```

- [ ] **Step 5: Commit**

```bash
git add packages/skill-evals skills/caido-operator
git commit -m "feat: add portable Caido operator skill"
```

### Task 10: Generated tool reference and MCP prompts

**Files:**
- Create: `scripts/generate-tool-reference.ts`, `check-generated-files.ts`
- Generate: `skills/caido-operator/references/tool-selection.md`
- Create: `packages/mcp-server/src/prompts/*.ts`
- Create: `packages/mcp-server/tests/prompts.contract.test.ts`, `generated-docs.test.ts`

**Interfaces:**
- Produces: deterministic Markdown from registry metadata.
- Registers: four specified user-controlled prompt templates.

- [ ] **Step 1: Write RED drift and prompt-discovery tests**

Assert undocumented tools, unknown Skill tool names, missing descriptions/annotations/schemas, and generated-file mismatch fail.

- [ ] **Step 2: Run RED, implement generation and prompt registration, then run GREEN**

```bash
pnpm test:contract -- packages/mcp-server/tests/prompts.contract.test.ts packages/mcp-server/tests/generated-docs.test.ts
pnpm generate:tools
pnpm check:generated
```

- [ ] **Step 3: Commit**

```bash
git add scripts skills/caido-operator/references/tool-selection.md packages/mcp-server
git commit -m "feat: generate tool guidance and MCP prompts"
```

### Task 11: Gated active operations

**Files:**
- Create: focused handlers under `packages/mcp-server/src/tools/active/`
- Create: `packages/mcp-server/tests/active-tools.contract.test.ts`
- Create: `tests/integration/active-tools.integration.test.ts`

**Interfaces:**
- Registers only in active mode: project selection, Replay, raw send, finding create/update, Intercept state, workflow run.
- Consumes: scope guard for network actions and dedicated audit events for every mutation.

- [ ] **Step 1: Write RED mode, scope, and mutation tests**

Assert absence in read-only/admin modes, scope-required network calls, no mutation retry, explicit mutation summaries, tight bounds, evidence IDs, and active annotations.

- [ ] **Step 2: Run RED**

Run: `pnpm test:contract -- packages/mcp-server/tests/active-tools.contract.test.ts`

- [ ] **Step 3: Implement one bounded adapter call per handler**

No handler loops over targets or chains a follow-up action. Active upstream errors return without automatic retry.

- [ ] **Step 4: Run GREEN and commit**

```bash
pnpm test:contract
pnpm test:integration
git add packages/mcp-server tests/integration
git commit -m "feat: add scope-gated active Caido operations"
```

### Task 12: E2E harness and Intel macOS verification

**Files:**
- Create: `tests/e2e/*.test.ts`, `tests/fixtures/http-server.ts`
- Create: `scripts/verify-macos-intel.sh`
- Create: `skills/caido-operator/scripts/doctor.sh`, `verify-skill.mjs`, `verify-mcp.mjs`
- Create: path-with-spaces contract fixture.

**Interfaces:**
- Produces: opt-in `CAIDO_E2E=1 pnpm test:e2e`.
- Produces: deterministic Intel/runtime/path/permission/stdio checks.

- [ ] **Step 1: Write RED script and E2E harness tests**

Test arm64 rejection through injected command fixtures, Node architecture/version, absolute path startup, paths with spaces, no `/proc`, cache modes, stdout purity, and localhost-only fixture enforcement.

- [ ] **Step 2: Run RED, implement scripts and localhost fixture, then run GREEN**

```bash
pnpm test:contract
pnpm test:skill
bash scripts/verify-macos-intel.sh
```

- [ ] **Step 3: Attempt real-Caido E2E only when health and credentials are available**

Run: `CAIDO_E2E=1 pnpm test:e2e`

Expected on the current host: explicit skip/failure preflight identifying unavailable Caido without contacting a public target.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e tests/fixtures scripts skills/caido-operator/scripts
git commit -m "test: add localhost E2E and Intel verification"
```

### Task 13: Product, security, and operational documentation

**Files:**
- Create: `README.md`, `README.id.md`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`
- Create: `docs/00-gap-analysis.md` through `docs/10-troubleshooting.md`, `docs/roadmap.md`
- Update: `AGENTS.md`

**Interfaces:**
- Documents: architecture, threat model, tool catalog, Skill design, testing, evals, Intel setup, verified client configuration, troubleshooting, release and credential cleanup.

- [ ] **Step 1: Write RED documentation validation tests**

Validate required headings, verified source links/dates, Bahasa Indonesia operational sections, cross-file links, exact client commands, no unfinished markers, and roadmap-only deferred capabilities.

- [ ] **Step 2: Run RED**

Run: `pnpm test:docs`

- [ ] **Step 3: Write concise validated documentation and threat mitigations**

The threat model covers credential/model-context disclosure, prompt injection, scope escape, destructive actions, traffic volume, token theft, logs, malicious files, traversal/symlinks, stdio corruption, and supply chain.

- [ ] **Step 4: Run GREEN and commit**

```bash
pnpm test:docs
git add README.md README.id.md LICENSE SECURITY.md CHANGELOG.md docs AGENTS.md
git commit -m "docs: add secure operations and client guides"
```

### Task 14: CI, packaging, and release gates

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `scripts/license-inventory.ts`, `scripts/secret-scan.ts`, `scripts/release-check.ts`
- Create: build configuration and package exports in package manifests.

**Interfaces:**
- Produces: reproducible `pnpm build`, stdio launch command, dependency/license inventory, and `pnpm verify`.

- [ ] **Step 1: Write RED release-gate tests**

Assert `pnpm verify` includes format, lint, typecheck, unit, contract, integration, Skill, eval, docs, generated drift, coverage, build, audit, secret scan, and license inventory.

- [ ] **Step 2: Run RED, add CI/build/release scripts, then run GREEN**

Pin official GitHub Actions by major version. Document that hosted arm64 macOS does not prove Intel compatibility when no x86_64 runner is available.

```bash
pnpm verify
pnpm audit --audit-level high
```

- [ ] **Step 3: Inspect MCP with the official Inspector**

Run: `pnpm exec @modelcontextprotocol/inspector node "$(pwd)/packages/mcp-server/dist/index.js"`

Expected: tools, resources, and prompts list successfully; safe health invocation returns the stable envelope.

- [ ] **Step 4: Commit**

```bash
git add .github package.json packages scripts
git commit -m "ci: add reproducible release quality gates"
```

### Task 15: Final verification and release evidence

**Files:**
- Update: `CHANGELOG.md`, release checklist section in documentation.

**Interfaces:**
- Produces: inspected command output, exact counts, coverage, E2E state, Intel evidence, clean generated files, and final tree.

- [ ] **Step 1: Run every release command freshly**

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:contract
pnpm test:integration
pnpm test:skill
pnpm eval:skill
pnpm test:docs
pnpm build
pnpm verify
bash scripts/verify-macos-intel.sh
```

- [ ] **Step 2: Inspect coverage, dependency audit, stdout purity, generated drift, and Git state**

```bash
pnpm coverage
pnpm audit --audit-level high
pnpm check:generated
git diff --check
git status --short
```

- [ ] **Step 3: Record the real-Caido E2E state accurately**

If Caido and credentials remain unavailable, do not mark E2E as passed. Record the exact operator command:

```bash
CAIDO_E2E=1 CAIDO_AGENT_MODE=active CAIDO_PAT='<operator-supplied>' pnpm test:e2e
```

- [ ] **Step 4: Commit release evidence**

```bash
git add CHANGELOG.md docs
git commit -m "chore: finalize release evidence"
```
