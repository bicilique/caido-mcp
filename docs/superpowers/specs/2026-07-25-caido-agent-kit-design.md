# Caido Agent Kit Design

**Date:** 2026-07-25  
**Status:** Approved design  
**Product:** `caido-agent-kit`

## Purpose

`caido-agent-kit` is a local, security-first integration between AI agents and an already-running Caido instance. It combines:

1. A portable Agent Skill that teaches safe operating judgment.
2. A local stdio MCP server that exposes typed atomic operations.
3. A shared Caido client and security boundary.
4. Deterministic tests and agent-behavior evaluations.
5. Operational documentation validated for Intel macOS.

The Skill owns reasoning, sequencing, evidence standards, and recovery guidance. The MCP server owns execution, validation, authentication, scope enforcement, redaction, limits, and auditing.

## Validated Baseline

Primary-source findings are recorded in `docs/research-current-sources.md`.

- Caido 0.57.1 has native macOS `x86_64` artifacts.
- `@caido/sdk-client` 0.5.0 is the official client. It has no package-level Node engine, but the official repository pins Node 24.11.1 and pnpm 10.28.2.
- The stable MCP protocol is 2025-11-25. The production TypeScript SDK is the maintained v1 line, currently 1.29.0.
- The official SDK has high-level clients for projects, scopes, filters, findings, requests, workflows, tasks, and Replay. Sitemap and Intercept require a lower-level typed adapter or deferral.
- The official `caido/skills` project is a useful API/workflow reference but combines reasoning and execution and does not provide the required security boundary.
- The community MCP server provides useful registry, redaction, and response-diff ideas, but registers destructive and high-volume tools together and does not enforce scope before every active request.

## Architecture

The repository is a pnpm TypeScript monorepo:

- `packages/core` contains configuration, errors, result envelopes, authentication, token caching, Caido adapters, scope enforcement, redaction, body bounds, rate limiting, and audit logging.
- `packages/mcp-server` contains stdio startup, lifecycle handling, the canonical registry, tools, resources, prompts, and serialization.
- `packages/skill-evals` contains deterministic Skill activation, safety, tool-selection, and response-format evaluation.
- `skills/caido-operator` contains the portable Skill, progressively loaded references, validation scripts, and reporting assets.
- `tests` contains MCP contracts, mock-Caido integration tests, localhost-only E2E tests, and fixtures.

The canonical MCP registry is the sole source of tool names, descriptions, input/output schemas, annotations, mode requirements, and documentation metadata. Tool-selection documentation is generated from this registry and checked for drift.

## Caido Integration Boundary

The implementation uses the official SDK first. A `CaidoAdapter` interface presents only operations required by registered tools and resources. SDK-backed implementations map official response types into stable project-owned types.

When the official SDK lacks a required capability, a GraphQL document may be added only under `packages/core/src/caido/graphql/`. Each document has:

- A named typed adapter.
- Input and output validation.
- A mock-server contract fixture.
- The expected Caido schema and tested version.
- Fallback and error behavior.
- A compatibility-risk entry in the architecture and gap-analysis documents.

No generic GraphQL tool or scattered query string is permitted.

## Security and Tool Lifecycle

Every call follows one lifecycle:

1. Parse strict configuration and validated tool input.
2. Load authentication without placing credentials in model context.
3. Apply cancellation, timeout, rate, body, and batch limits.
4. Resolve the selected project.
5. For active network actions, normalize the target and evaluate the current Caido scope.
6. Execute one adapter operation without hidden chaining or automatic mutation retry.
7. Pass the response through the shared redaction and body-handling boundary.
8. Mark traffic-derived data as untrusted evidence.
9. Write a secret-free bounded JSONL audit event.
10. Return text content plus schema-valid structured content in a stable `ToolResult<T>` envelope.

Scope matching normalizes schemes, ports, host case, trailing dots, Unicode/punycode, IPv4, and IPv6. Deny rules win. Ambiguous targets and missing scopes fail closed.

Sensitive headers and token-like structured values are redacted by default. Bodies are bounded and fingerprinted; large binary content returns metadata rather than raw bytes. Audit logs never include credentials, cookies, or full sensitive bodies, even when sensitive tool output is explicitly enabled.

Captured traffic is untrusted. MCP metadata identifies its source, while the Skill directs agents never to obey embedded instructions, execute requested commands, browse target-supplied URLs, or change configuration because traffic content asks them to.

## Authentication and Local Storage

Authentication priority is cached access/refresh tokens, `CAIDO_PAT`, interactive browser/device login where supported, then explicitly configured direct tokens. The cache adapter rejects unsafe symlinks and insecure existing permissions, creates restrictive parent directories, and writes owner-only files. macOS defaults use per-user Application Support paths and support explicit overrides.

Secrets never appear in process arguments, MCP output, diagnostics, audit events, snapshots, or generated examples.

## Registration Modes and Capabilities

`read-only` registers the 14 specified read tools and six resources. `active` adds the seven specified bounded active tools. `admin` is reserved and registers no destructive capabilities.

The first release excludes deletion, scanning, fuzzing, race tooling, arbitrary GraphQL, arbitrary plugin RPC, shell execution, out-of-scope overrides, and remote MCP transport. Deferred capabilities are documented without registering placeholder tools.

An unavailable Caido instance is represented by deterministic health and error results. It does not prevent server initialization or mock-backed verification.

## Agent Skill

`caido-operator` follows the Agent Skills specification and uses portable frontmatter. Its main file contains activation boundaries, preconditions, authorization and prompt-injection rules, read-only-first sequencing, tool selection, investigation/replay/finding workflows, evidence formatting, recovery, examples, anti-examples, and reference routing.

Detailed HTTPQL, Replay, finding, active-testing, Intel macOS, and troubleshooting material remains in shallow references loaded only when relevant. The Skill contains no API client, credentials, arbitrary shell guidance, or duplicated tool catalog.

## AI Client Compatibility

Codex CLI, Claude Code, and Cursor are explicit compatibility targets.

- The Skill uses the cross-client Agent Skills directory contract without agent-specific execution logic.
- The MCP server uses local stdio and the stable MCP protocol.
- Tools return both concise text and `structuredContent`.
- Prompts are user-controlled templates and never execute tools.
- Client examples use absolute executable paths and preserve paths containing spaces as separate arguments.
- Documentation includes dated, primary-source-verified Codex, Claude, and Cursor configuration and validation commands.

Contract tests initialize and exercise the real stdio server, inspect tool/resource/prompt discovery, validate schemas and annotations, verify clean stdout, and test an absolute launch path containing spaces.

## Testing Strategy

Production behavior is developed in strict RED–GREEN–REFACTOR increments and committed after each independently testable change.

- Unit tests cover configuration, error/result contracts, redaction, body handling, fingerprints, URL normalization, scope matching, token-cache permissions, audit serialization, and macOS paths.
- MCP contract tests cover initialization, discovery, mode registration, schemas, structured output, cancellation, stdout purity, and generated-document drift.
- Integration tests use a mock Caido HTTP/GraphQL server while exercising real adapter and handler boundaries.
- Skill evaluations statically and deterministically cover all 20 required activation, safety, intent, and response scenarios.
- Real-Caido E2E is opt-in, uses a dedicated test project and localhost fixture, and never targets an arbitrary public host.

Coverage gates are 80% overall branch coverage and 90% for redaction, scope guard, configuration, and authentication. All deterministic safety evaluations must pass.

## Delivery and Platform Validation

The project requires Node 24 x64 and pins pnpm 10.28.2. Intel validation fails unless `uname -m` is `x86_64` and Node reports `x64`. Scripts avoid `/proc`, Apple Silicon Homebrew assumptions, implicit shell interpolation, and Rosetta.

CI runs deterministic checks on supported hosted runners. If a genuine macOS x86_64 runner is unavailable, CI states that limitation and does not represent arm64 as Intel validation. Release evidence requires the local Intel verification script.

Because the design host currently has Node 22, no pnpm command, and no reachable Caido instance, implementation setup must first activate Node 24 x64 and pnpm 10.28.2. Real-Caido E2E remains the only externally blocked gate while Caido is offline; the final report must state the exact remaining command.

## Error and Shutdown Behavior

All operational failures map to the specified stable error-code union with safe remediation and retryability. Upstream errors are sanitized before logging or return. SIGINT and SIGTERM stop accepting work, close Caido connections, flush audit output, and close stdio without writing diagnostics to stdout.

## Documentation Deliverables

The repository includes the requested English technical documents and Bahasa Indonesia operational guide. Tool documentation is generated from the registry. Security documentation explains authorization, prompt injection, redaction, scope enforcement, active mode, audit behavior, vulnerability reporting, and limitations. The release checklist records exact commands, versions, test counts, coverage, E2E state, and Intel evidence.
