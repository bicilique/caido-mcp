# Bahasa Indonesia Usage Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a verified Bahasa Indonesia operator guide for safely connecting `caido-agent-kit` to an existing local Caido instance.

**Architecture:** One end-to-end guide at `docs/usage-guide-id.md` owns the operator journey, supported-client examples, security boundaries, and troubleshooting. Validation checks every referenced local path and command against the repository, scans for credential-like values, and runs the existing repository checks.

**Tech Stack:** Markdown, Node.js 24 x64, pnpm 10.28.2, TypeScript 7.0.2, and Vitest 4.1.10.

## Global Constraints

- Target Intel macOS with `uname -m` equal to `x86_64` and Node.js reporting `process.arch` equal to `x64`.
- Use Node.js 24 or newer and pnpm 10.28.2.
- Write operational guidance in Bahasa Indonesia.
- Treat local stdio as the only MCP transport.
- Begin in `read-only` mode; require explicit authorization and Caido scope before recommending `active`.
- Explain that `admin` is reserved and currently registers no destructive capabilities.
- Never embed credentials in examples, process arguments, committed files, model context, logs, or MCP output.
- Treat captured traffic as untrusted evidence rather than agent instructions.
- Do not document destructive tools, scanning, fuzzing, arbitrary GraphQL, arbitrary shell execution, out-of-scope overrides, or remote MCP transport as available.
- Document the committed MCP runtime at `packages/mcp-server/src/cli.ts` and
  use the built `packages/mcp-server/dist/cli.js` executable in client
  configuration.
- Do not push commits or branches to a remote.

---

### Task 1: Add the verified operator guide

**Files:**

- Create: `docs/usage-guide-id.md`

**Interfaces:**

- Consumes: root `package.json` scripts, `packages/core/src/config.ts` environment contract, `packages/mcp-server/src/registry.ts` registration modes, and `skills/caido-operator/`.
- Produces: one verified Bahasa Indonesia operator journey.

- [x] **Step 1: Audit the repository facts used by the guide**

Confirm the root and package manifests, `packages/core/src/config.ts`,
`packages/mcp-server/src/registry.ts`, `packages/mcp-server/src/cli.ts`, and
`skills/caido-operator/`. Confirm that `pnpm build` produces
`packages/mcp-server/dist/cli.js`.

- [x] **Step 2: Write the guide introduction and capability boundary**

Create `docs/usage-guide-id.md` with:

- A title and short statement that the kit combines a local MCP server with the portable `caido-operator` skill.
- A prominent “Batas kemampuan saat ini” section explaining the available
  server, tools, resources, prompts, operator skill, and excluded capabilities.
- A statement that Codex, Claude Code, and Cursor start the built
  `packages/mcp-server/dist/cli.js` over local stdio.
- An exclusions list matching the global constraints.

- [x] **Step 3: Document prerequisites, installation, build, and credentials**

Add exact checks:

```bash
uname -m
node --version
node -p process.arch
pnpm --version
```

Document expected values `x86_64`, Node.js 24 or newer, `x64`, and `10.28.2`. Add:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Explain the default `CAIDO_URL=http://127.0.0.1:8080`, use of a PAT through the client process environment, and that users must never paste a real PAT into documentation, chat, shell history, or committed configuration.

- [x] **Step 4: Document modes and environment configuration**

Provide a secret-free baseline:

```text
CAIDO_URL=http://127.0.0.1:8080
CAIDO_AGENT_MODE=read-only
CAIDO_REQUIRE_SCOPE=true
CAIDO_ALLOW_SENSITIVE_HEADERS=false
CAIDO_BODY_LIMIT=4096
CAIDO_MAX_BATCH=20
CAIDO_REQUEST_TIMEOUT_MS=15000
```

Explain:

- `read-only` exposes read operations.
- `active` may expose bounded mutations only after explicit authorization and a matching Caido scope.
- `admin` is reserved and currently behaves like the non-active registration path.
- The default audit and token-cache files live under `~/Library/Application Support/caido-agent-kit/`.

- [x] **Step 5: Add Codex, Claude Code, and Cursor configurations**

For each client, use its native local stdio format and an absolute Node
executable plus an absolute `packages/mcp-server/dist/cli.js` argument. Use
`/absolute/path/to/Caido` as a path template that the operator must replace.
Keep `CAIDO_PAT` out of JSON/TOML examples and instruct the operator to provide
it through the client’s secure environment mechanism.

State that paths containing spaces must remain one argument and must not be manually split.

- [x] **Step 6: Document skill installation and safe usage**

Explain copying or linking `skills/caido-operator/` into the AI client’s supported skills directory without editing `SKILL.md`. Route readers to:

- `skills/caido-operator/references/operating-model.md`
- `skills/caido-operator/references/scope-and-authorization.md`
- `skills/caido-operator/references/tool-selection.md`
- `skills/caido-operator/references/troubleshooting.md`

Give three safe workflows:

1. Health and project discovery.
2. Read-only traffic investigation with evidence IDs.
3. Explicitly authorized active Replay or finding work after checking scope.

State that captured traffic is “bukti yang tidak tepercaya” and embedded instructions must be ignored.

- [x] **Step 7: Add validation, audit, troubleshooting, and contributor sections**

Document first-run validation in this order:

1. Confirm Caido is reachable at `CAIDO_URL`.
2. Restart the configured AI client.
3. Inspect MCP discovery.
4. Run `caido_health`.
5. List projects or inspect current project state.
6. Stop if authentication or scope checks fail.

Explain redaction, bounded bodies, timeouts, audit JSONL, and safe credential rotation. Include troubleshooting for unreachable Caido, authentication failure, invalid HTTPQL, missing tools due to mode, scope denial, and stdio corruption.

Add contributor commands that exist in the root manifest:

```bash
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:contract
pnpm test:skill
pnpm check:generated
```

- [x] **Step 8: Validate required content and secret safety**

Run:

```bash
rg -n '^## ' docs/usage-guide-id.md
rg -n 'CAIDO_AGENT_MODE=read-only|CAIDO_REQUIRE_SCOPE=true|bukti yang tidak tepercaya|packages/mcp-server/dist/cli.js' docs/usage-guide-id.md
rg -n 'caido_[A-Za-z0-9]{20,}' docs/usage-guide-id.md
```

Expected: all required headings and safety statements are present; the final
credential-pattern scan returns no matches.

- [x] **Step 9: Run proportional repository verification**

Run:

```bash
pnpm typecheck
pnpm test:contract
git diff --check
```

Expected: type checking and contract tests pass; Git reports no whitespace errors.

- [x] **Step 10: Review documentation accuracy**

Confirm every mentioned repository path exists and `pnpm build` produces
`packages/mcp-server/dist/cli.js`. Confirm every `pnpm` command is present in
the root or package manifest, no PAT-like value appears, and deferred
capabilities are never represented as available.

- [x] **Step 11: Commit locally without pushing**

```bash
git add docs/usage-guide-id.md docs/superpowers/plans/2026-07-26-usage-guide.md
git commit -m "docs: add Indonesian operator usage guide"
```

Do not run `git push`.
