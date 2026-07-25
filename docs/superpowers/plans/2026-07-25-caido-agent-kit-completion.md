# Caido Agent Kit Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved Caido Agent Kit design, close the audited security/runtime gaps, and make every non-optional release gate pass on Intel macOS.

**Architecture:** Preserve the existing pnpm monorepo and `CaidoAdapter` boundary. Add one shared MCP execution pipeline for timeout, cancellation, error normalization, redaction, rate limiting, and auditing; assemble it with a production SDK adapter and stdio entrypoint; then add gated active operations, realistic integration/E2E coverage, deterministic Skill evaluation, documentation, and release automation.

**Tech Stack:** Node.js 24 x64, pnpm 10.28.2, strict TypeScript 7.0.2, Vitest 4.1.10, Zod 4.4.3, `@caido/sdk-client` 0.5.0, `@modelcontextprotocol/sdk` 1.29.0.

## Global Constraints

- Target macOS Intel: `uname -m` must be `x86_64`; Node must report `x64`.
- MCP uses local stdio; stdout contains protocol frames only and diagnostics use stderr.
- Default mode is read-only; active tools register only in explicit active mode; admin registers no destructive tools.
- Scope enforcement, sensitive-data redaction, bounded bodies/batches, timeouts, rate limits, and secret-free audit logging are enabled by default.
- Captured traffic is untrusted evidence and never an instruction source.
- No destructive, arbitrary GraphQL, arbitrary shell, fuzzing, race, scanning, or remote-transport tool is registered.
- Production behavior follows observed RED–GREEN–REFACTOR.
- Code, schemas, and tool metadata are English; operational documentation is Bahasa Indonesia.

---

### Task 1: Shared security execution pipeline and secret-leak regression

**Files:**
- Modify: `packages/mcp-server/src/server.ts`
- Modify: `packages/mcp-server/src/registry.ts`
- Modify: `packages/mcp-server/src/tools/read/traffic.ts`
- Modify: `packages/mcp-server/src/tools/read/knowledge.ts`
- Modify: `packages/mcp-server/src/resources/index.ts`
- Modify: `packages/mcp-server/src/tools/shared.ts`
- Create: `packages/mcp-server/src/execution/pipeline.ts`
- Create: `packages/mcp-server/tests/security-pipeline.contract.test.ts`
- Modify: `packages/mcp-server/tests/read-tools.contract.test.ts`

**Interfaces:**
- Produces: `createToolExecutor(options): (tool, input, signal) => Promise<Record<string, unknown>>`.
- Produces: one redaction/body pipeline shared by tools and resources.
- Consumes: `normalizeError`, `errorResult`, `AuditLogger`, `RateLimiter`, `AgentConfig`.

- [ ] **Step 1: Add failing behavior tests**

Add contract tests proving that JSON token fields and URL query tokens from `caido_get_request` are redacted, upstream secret-bearing errors return sanitized deterministic envelopes, aborted calls stop, timeouts return `TIMEOUT`, rate exhaustion returns `RATE_LIMITED`, and every call emits a secret-free audit event.

- [ ] **Step 2: Run RED**

Run:

```bash
corepack pnpm test:contract -- packages/mcp-server/tests/security-pipeline.contract.test.ts packages/mcp-server/tests/read-tools.contract.test.ts
```

Expected: failures show body/query secrets are returned and no central timeout/error/audit behavior exists.

- [ ] **Step 3: Implement the shared pipeline**

The executor validates through the registered schema, combines caller cancellation with the configured timeout, consumes one rate-limit token, invokes exactly one handler, recursively redacts output/error data, normalizes failures into `ToolResult`, records duration/truncation/evidence IDs, and writes one audit event. It must never put raw upstream error text in output or logs.

- [ ] **Step 4: Apply safe traffic serialization**

For text-like JSON bodies, parse when valid and apply `redactStructured`; for other text redact raw HTTP/header-like content and token-bearing URL query values without changing non-secret evidence. Keep binary bodies metadata-only. Apply the same serializer to request resources and bound finding evidence.

- [ ] **Step 5: Run GREEN and coverage for changed modules**

Run:

```bash
corepack pnpm test:contract -- packages/mcp-server/tests/security-pipeline.contract.test.ts packages/mcp-server/tests/read-tools.contract.test.ts packages/mcp-server/tests/resources.contract.test.ts
corepack pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/mcp-server
git commit -m "fix: enforce the MCP security execution pipeline"
```

---

### Task 2: Production Caido adapter and stdio runtime

**Files:**
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/caido/sdk-adapter.ts`
- Create: `packages/core/src/caido/mappers.ts`
- Modify: `packages/core/src/caido/adapter.ts`
- Modify: `packages/core/src/caido/client.ts`
- Create: `packages/core/tests/caido/sdk-adapter.test.ts`
- Create: `packages/mcp-server/src/index.ts`
- Create: `packages/mcp-server/src/runtime.ts`
- Modify: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tests/stdio.contract.test.ts`
- Create: `packages/mcp-server/tests/runtime.contract.test.ts`

**Interfaces:**
- Produces: `SdkCaidoAdapter implements CaidoAdapter`.
- Produces: `createRuntime(env, io)` and `runStdioServer()`.
- Produces: real `packages/core/dist/index.js` and `packages/mcp-server/dist/index.js`.

- [ ] **Step 1: Write failing adapter/runtime tests**

Use a controlled SDK-shaped fake at the SDK boundary to assert mapping for health, projects, requests, scopes, findings, Replay sessions, workflows, filters, and clean close. Spawn the built entrypoint to assert MCP initialize/list requests use stdout only, diagnostics use stderr, absolute paths with spaces work, and SIGTERM closes adapter/audit resources.

- [ ] **Step 2: Run RED**

Run:

```bash
corepack pnpm test:unit -- packages/core/tests/caido/sdk-adapter.test.ts
corepack pnpm test:contract -- packages/mcp-server/tests/runtime.contract.test.ts packages/mcp-server/tests/stdio.contract.test.ts
```

Expected: missing adapter, runtime, and entrypoint failures.

- [ ] **Step 3: Implement SDK mapping and runtime assembly**

Use official high-level SDK clients where present. Keep direct SDK response types behind mapper functions validated with Zod. Runtime parses config, creates `SecureTokenCache`, connects the SDK client, creates the production adapter, audit logger, rate limiter, read resources/tools, prompts, and active tools for the selected mode, then connects `StdioServerTransport`.

- [ ] **Step 4: Implement lifecycle**

SIGINT/SIGTERM stop accepting work, close MCP, close adapter, flush/close audit logging, and exit without ordinary stdout logs. Caido being unreachable must still allow a deterministic health/error result where SDK initialization permits it.

- [ ] **Step 5: Run GREEN and inspect artifacts**

Run:

```bash
corepack pnpm test:unit -- packages/core/tests/caido
corepack pnpm test:contract -- packages/mcp-server/tests/runtime.contract.test.ts packages/mcp-server/tests/stdio.contract.test.ts
corepack pnpm -r build
test -f packages/core/dist/index.js
test -f packages/mcp-server/dist/index.js
```

- [ ] **Step 6: Commit**

```bash
git add packages/core packages/mcp-server
git commit -m "feat: add the production Caido stdio runtime"
```

---

### Task 3: Gated active tools and realistic integration/E2E harness

**Files:**
- Create: `packages/mcp-server/src/tools/active/index.ts`
- Create focused handlers under: `packages/mcp-server/src/tools/active/`
- Create: `packages/mcp-server/tests/active-tools.contract.test.ts`
- Create: `tests/integration/mock-caido-server.ts`
- Create: `tests/integration/read-only.integration.test.ts`
- Create: `tests/integration/active-tools.integration.test.ts`
- Create: `tests/e2e/caido.e2e.test.ts`
- Create: `tests/fixtures/http-server.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Registers in active mode only: `caido_select_project`, `caido_replay_request`, `caido_send_raw_request`, `caido_create_finding`, `caido_update_finding`, `caido_set_intercept`, `caido_run_workflow`.
- Produces: localhost-only mock/integration and opt-in real-Caido E2E suites.

- [ ] **Step 1: Write RED mode/scope/mutation contracts**

Assert active tools are absent from read-only/admin modes; network mutations require an allowed selected scope; missing/ambiguous/denied scope returns `OUT_OF_SCOPE`; every mutation returns an explicit summary and dedicated audit event; no mutation automatically retries.

- [ ] **Step 2: Run RED**

Run:

```bash
corepack pnpm test:contract -- packages/mcp-server/tests/active-tools.contract.test.ts
```

- [ ] **Step 3: Implement one bounded adapter call per active handler**

Use strict schemas and active annotations. Replay/raw-send resolve scheme, normalized host, and port before scope evaluation. Finding/project/intercept/workflow mutations remain atomic and still require active mode.

- [ ] **Step 4: Add real-boundary integration tests**

The mock server simulates healthy/auth failure/refresh, history pagination, request retrieval, invalid HTTPQL, scopes, Replay success/timeout, upstream errors, missing projects, large/binary bodies, and malformed data. Tests exercise runtime → adapter → mock server rather than replacing the adapter.

- [ ] **Step 5: Add opt-in localhost-only E2E**

Skip unless `CAIDO_E2E=1`. Refuse non-loopback fixture targets. Verify health, current project, request list/detail, redaction, out-of-scope block, in-scope Replay, evidence IDs, secret-free audit, and clean shutdown.

- [ ] **Step 6: Run GREEN and commit**

```bash
corepack pnpm test:contract
corepack pnpm test:integration
corepack pnpm test:e2e
git add packages/mcp-server tests vitest.config.ts package.json
git commit -m "feat: add scope-gated active Caido operations"
```

---

### Task 4: Deterministic Skill behavior evaluation and exact schemas

**Files:**
- Modify: `packages/skill-evals/cases/cases.json`
- Create: `packages/skill-evals/src/evaluator.ts`
- Modify: `packages/skill-evals/tests/skill.test.ts`
- Modify: `packages/mcp-server/src/tools/shared.ts`
- Modify read/active tool definitions under: `packages/mcp-server/src/tools/`
- Modify: `scripts/generate-tool-reference.ts`
- Modify: `packages/mcp-server/tests/generated-docs.contract.test.ts`

**Interfaces:**
- Produces: `evaluateSkillCase(testCase, skillDocument): EvalResult`.
- Produces: cases containing prompt, expected intent, mode/confirmation flags, safety behavior, tools, and output fields.
- Produces: tool-specific strict output schemas and registry-derived documentation.

- [ ] **Step 1: Write RED evaluator and schema tests**

Each of the 20 required scenarios must pressure-test an observable decision from its prompt. Mutating activation, a required safety rule, active-mode gate, forbidden tool, or output-field contract must fail at least one case. Contract tests must reject malformed tool output that previously passed generic `record<string, unknown>` schemas.

- [ ] **Step 2: Run RED**

Run:

```bash
corepack pnpm test:skill
corepack pnpm test:contract -- packages/mcp-server/tests/generated-docs.contract.test.ts
```

- [ ] **Step 3: Implement deterministic evaluation and exact schemas**

Use static/rule-based evaluation only for release gating; optional model-backed execution must not be required. Define reusable DTO schemas but keep each tool's `data` shape exact. Error codes use the specified enum, not arbitrary strings.

- [ ] **Step 4: Regenerate tool documentation and detect all drift**

The check fails for missing description, annotations, schemas, undocumented registered tools, Skill references to unregistered tools, or changed generated output.

- [ ] **Step 5: Run GREEN and commit**

```bash
corepack pnpm generate:tools
corepack pnpm test:skill
corepack pnpm eval:skill
corepack pnpm check:generated
corepack pnpm typecheck
git add packages/skill-evals packages/mcp-server scripts skills/caido-operator/references/tool-selection.md
git commit -m "test: enforce Skill behavior and exact MCP contracts"
```

---

### Task 5: Intel verification, documentation, CI, and release commands

**Files:**
- Create: `README.md`, `README.id.md`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`
- Create: `docs/00-gap-analysis.md` through `docs/10-troubleshooting.md`
- Create: `docs/roadmap.md`
- Create: `docs/release-checklist.md`
- Create: `scripts/verify-macos-intel.sh`
- Create: `scripts/check-generated-files.ts`
- Create: `scripts/secret-scan.ts`
- Create: `scripts/license-inventory.ts`
- Create: `scripts/release-check.ts`
- Create: `skills/caido-operator/scripts/doctor.sh`
- Create: `skills/caido-operator/scripts/verify-skill.mjs`
- Create: `skills/caido-operator/scripts/verify-mcp.mjs`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Create: `tests/docs/documentation.test.ts`
- Create: `tests/contract/macos-intel.contract.test.ts`

**Interfaces:**
- Produces all required root commands: `lint`, `typecheck`, `test:unit`, `test:contract`, `test:integration`, `test:e2e`, `test:skill`, `eval:skill`, `test:docs`, `build`, `coverage`, `verify`.
- Produces deterministic Intel/path/permission/stdio verification and release gates.

- [ ] **Step 1: Write RED documentation/release/script contracts**

Test required Bahasa Indonesia headings, dated client configurations for Codex CLI/Claude Code/Cursor, credential cleanup, roadmap-only deferred operations, security topics, absolute/path-with-spaces launch, arm64 rejection, Node x64 requirement, stdout purity, and that `verify` includes all non-optional gates.

- [ ] **Step 2: Run RED**

Run:

```bash
corepack pnpm test:docs
corepack pnpm test:contract -- tests/contract/macos-intel.contract.test.ts
```

- [ ] **Step 3: Implement scripts and documentation**

Use the validated sources already recorded in `docs/research-current-sources.md`. Do not claim hosted arm64 CI proves Intel compatibility. Document exact local verification and opt-in E2E commands.

- [ ] **Step 4: Add CI and release automation**

Use frozen lockfile, formatting/lint/typecheck, unit/contract/integration/Skill/docs/eval, generated drift, coverage, build, audit, secret scan, and license inventory. Pin official actions by major version and avoid unreviewed third-party actions.

- [ ] **Step 5: Run GREEN and commit**

```bash
corepack pnpm test:docs
corepack pnpm test:contract -- tests/contract/macos-intel.contract.test.ts
bash scripts/verify-macos-intel.sh
corepack pnpm lint
corepack pnpm build
git add README.md README.id.md LICENSE SECURITY.md CHANGELOG.md docs scripts skills/caido-operator/scripts .github package.json tests
git commit -m "ci: add documented Intel release gates"
```

---

### Task 6: Coverage, full verification, and release evidence

**Files:**
- Modify tests and production files identified by coverage/final review.
- Modify: `CHANGELOG.md`
- Modify: `docs/release-checklist.md`

**Interfaces:**
- Produces: at least 80% overall branch coverage and at least 90% branch coverage for redaction, scope guard, config, and authentication.
- Produces: fresh release evidence without claiming unavailable real-Caido E2E.

- [ ] **Step 1: Run coverage and write RED tests for uncovered required behavior**

Do not add assertion-free or source-grep tests for coverage. Add behavior tests for realistic wrong branches, missing side effects, cancellation, malformed upstream data, redaction, active gating, and shutdown.

- [ ] **Step 2: Meet coverage thresholds**

Run:

```bash
corepack pnpm coverage
```

Expected: all configured thresholds pass.

- [ ] **Step 3: Run every non-optional gate freshly**

Run:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:contract
corepack pnpm test:integration
corepack pnpm test:skill
corepack pnpm eval:skill
corepack pnpm test:docs
corepack pnpm check:generated
corepack pnpm build
corepack pnpm verify
bash scripts/verify-macos-intel.sh
corepack pnpm audit --audit-level high
git diff --check
```

- [ ] **Step 4: Inspect with MCP Inspector**

Run the official Inspector against the absolute `packages/mcp-server/dist/index.js` path and confirm tools, resources, prompts, and safe health invocation.

- [ ] **Step 5: Record accurate E2E state**

If credentials are unavailable, record this exact remaining command without marking E2E passed:

```bash
CAIDO_E2E=1 CAIDO_AGENT_MODE=active CAIDO_PAT='<operator-supplied>' corepack pnpm test:e2e
```

- [ ] **Step 6: Commit release evidence**

```bash
git add CHANGELOG.md docs/release-checklist.md packages tests scripts package.json
git commit -m "chore: finalize Caido Agent Kit release evidence"
```
