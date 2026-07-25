# Current Source Verification

Verified on **2026-07-25**. `deep-research-report.md` was used only to identify leads; every finding below was checked against the owning project's documentation, source repository, specification, or package registry. The community server is deliberately treated as a non-authoritative implementation reference.

## Caido application and Client SDK

Caido's application documentation presents Agent Skills as an open-standard folder containing `SKILL.md`, optionally accompanied by scripts, references, and assets. It describes the official `caido/skills` package as a programmatic bridge to a running Caido instance and separately labels the documented MCP server as community-developed ([Caido Skills tutorial](https://docs.caido.io/app/tutorials/skills.html), [MCP tutorial](https://docs.caido.io/app/tutorials/mcp)).

Caido's official release endpoint reported **0.57.1**, released 2026-07-10, with native macOS `x86_64` CLI, DMG, and ZIP downloads. This directly supports Intel macOS without Rosetta ([release endpoint](https://caido.download/releases/latest), [macOS quickstart](https://docs.caido.io/app/quickstart/mac.html), [download-link reference](https://docs.caido.io/app/reference/download_links)).

The current npm registry metadata reports **`@caido/sdk-client` 0.5.0**, MIT-licensed, with built-in TypeScript declarations and no package-level `engines` field ([registry metadata](https://registry.npmjs.org/%40caido%2Fsdk-client/latest)). The SDK handles authentication plus GraphQL and REST access. Its current `Client` exposes health/readiness, low-level typed GraphQL and REST clients, and high-level SDKs for users, plugins, projects, scopes, filter presets, environments, DNS settings, hosted files, instance data, findings, requests, workflows, tasks, and Replay ([client source](https://github.com/caido/sdk-js/blob/main/packages/sdk-client/src/client.ts), [SDK exports](https://github.com/caido/sdk-js/blob/main/packages/sdk-client/src/sdks/index.ts)). Sitemap, Intercept, Automate, and WebSocket history are not exposed as top-level high-level SDKs in that source, so those capabilities need either documented lower-level typed GraphQL adapters or deferral.

The published subpackage does not itself prove a minimum Node version. However, the official monorepo requires Node `>=20`, `graphql-ws 6.x` also requires Node `>=20`, and Caido pins Node **24.11.1** and pnpm **10.28.2** for development ([monorepo package](https://github.com/caido/sdk-js/blob/main/package.json), [SDK package](https://github.com/caido/sdk-js/blob/main/packages/sdk-client/package.json), [Caido mise configuration](https://github.com/caido/sdk-js/blob/main/.mise/config.toml), [graphql-ws metadata](https://registry.npmjs.org/graphql-ws/6.0.6)). Therefore Node 24 x64 is a conservative, source-supported project baseline; claiming Node 18 from package metadata would be incorrect.

The SDK supports PAT-assisted, browser/device, and direct-token authentication with token caching; `connect()` loads cached tokens, authenticates, stores resulting tokens, and optionally waits for readiness ([Client `connect`](https://github.com/caido/sdk-js/blob/main/packages/sdk-client/src/client.ts), [base setup](https://developer.caido.io/client-sdk/guides/base_setup.html)). The built-in file cache creates new files with mode `0600`, but does not establish restrictive parent permissions or reject symlinked/existing insecure cache paths, so the integration still needs a hardened wrapper ([file cache](https://github.com/caido/sdk-js/blob/main/packages/sdk-client/src/auth/cache/file.ts)).

Caido documents its GraphQL API as public but does not guarantee schema stability across releases; it also warns that Client SDK and instance versions may be incompatible. Every direct GraphQL query therefore needs a typed, centralized compatibility boundary and contract tests against the supported instance range ([GraphQL concept](https://docs.caido.io/app/concepts/graphql.html), [headless orchestration](https://docs.caido.io/app/tutorials/headless_orchestration)).

## Official `caido/skills`

The official repository currently contains one primary skill, **`caido-mode` 3.0.1**, installed through `pnpm dlx skills add caido/skills` ([repository](https://github.com/caido/skills), [package manifest](https://github.com/caido/skills/blob/main/skills/caido-mode/package.json)). It is a full-coverage Claude-oriented CLI layered on `@caido/sdk-client`, with HTTPQL search, Replay/edit/raw send, project/scope/filter/environment/finding management, Intercept, tasks, plugins, and export features. It uses high-level SDK methods where available and centralizes additional GraphQL documents for missing features ([skill](https://github.com/caido/skills/blob/main/skills/caido-mode/SKILL.md), [GraphQL adapter](https://github.com/caido/skills/blob/main/skills/caido-mode/lib/graphql.ts)).

Concepts worth reusing are server-side HTTPQL filtering, bounded/context-conscious retrieval, preserving request evidence IDs, and isolating unsupported GraphQL. The implementation should not be copied wholesale: the skill combines reasoning and execution in a 650+ line skill/CLI bundle, enables active and destructive commands without a read-only registration boundary, contains no explicit captured-traffic prompt-injection policy, and writes PAT/access-token data to `~/.claude/config/secrets.json` without an explicit restrictive file mode in the write calls ([token-cache source](https://github.com/caido/skills/blob/main/skills/caido-mode/lib/client.ts), [setup source](https://github.com/caido/skills/blob/main/skills/caido-mode/lib/commands/info.ts)). `caido-agent-kit` should retain the official SDK while separating Skill reasoning from MCP execution and enforcing owner-only credential storage.

## Agent Skills specification

The Agent Skills specification requires a skill directory containing `SKILL.md` with YAML frontmatter. `name` and `description` are required; the name must be 1–64 lowercase alphanumeric/hyphen characters and match its directory, while the description determines discovery/activation ([specification](https://agentskills.io/specification)). Supporting `scripts/`, `references/`, and `assets/` directories are conventional. The official guidance calls for **progressive disclosure**: load metadata first, `SKILL.md` only after activation, and supporting files only when needed; it recommends keeping `SKILL.md` below 500 lines and 5,000 tokens ([client implementation guide](https://agentskills.io/client-implementation/adding-skills-support), [creator best practices](https://agentskills.io/skill-creation/best-practices)).

Implication: one concise `caido-operator` skill with narrowly routed references matches the standard better than embedding the entire Caido API or client implementation in the main skill. Validate it with the specification's reference implementation: `skills-ref validate ./skills/caido-operator` ([Agent Skills source](https://github.com/agentskills/agentskills)).

## MCP specification and TypeScript SDK

As of the verification date, the latest stable MCP specification is **2025-11-25**; the 2026-07-28 revision is only a release candidate. Production code should target the stable protocol rather than draft-only behavior ([stable specification](https://modelcontextprotocol.io/specification/2025-11-25), [release-candidate announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)).

The stable protocol supports server tools, resources, prompts, initialization instructions, cancellation, and stdio transport. A tool declares `inputSchema`, may declare `outputSchema`, can return `structuredContent`, and may attach `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. These annotations are untrusted hints, not enforcement controls ([tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [schema reference](https://modelcontextprotocol.io/specification/2025-11-25/schema), [stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)). For stdio, protocol messages belong on stdout and diagnostic output must go to stderr.

The current stable npm package is **`@modelcontextprotocol/sdk` 1.29.0**, MIT-licensed, requiring Node `>=18` ([registry metadata](https://registry.npmjs.org/%40modelcontextprotocol%2Fsdk/latest)). The official repository states that `main`/v2 is pre-alpha and recommends the maintained `v1.x` line for production until stable v2 ships ([official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)). Use the v1 package for this release; isolate SDK wiring so a later v2 migration is contained.

## Official client configuration checked 2026-07-25

### Codex CLI / OpenAI coding clients

Codex CLI, the Codex IDE extension, and the ChatGPT desktop app share MCP configuration. Local stdio can be registered with:

```bash
codex mcp add caido-agent-kit --env CAIDO_URL=http://127.0.0.1:8080 -- /absolute/path/to/node /absolute/path/to/server.js
```

The persistent form is `[mcp_servers.caido-agent-kit]` in `~/.codex/config.toml` or trusted project `.codex/config.toml`, using `command`, optional `args`, `env`, `env_vars`, and `cwd`. Validate with `codex mcp list` or `/mcp` ([OpenAI MCP documentation](https://developers.openai.com/codex/mcp/)). Absolute paths are appropriate for macOS client startup and paths containing spaces remain individual argument-array entries.

### Claude Code

Claude Code's verified local-stdio syntax is:

```bash
claude mcp add --transport stdio caido-agent-kit \
  --env CAIDO_URL=http://127.0.0.1:8080 \
  -- /absolute/path/to/node /absolute/path/to/server.js
```

The `--` separator is required before the server command. Claude supports local, project, and user scopes and JSON configuration through `.mcp.json`, `~/.claude.json`, or `claude mcp add-json`; inspect with `claude mcp list`/`claude mcp get` ([Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)).

### Cursor

Cursor supports local stdio using project `.cursor/mcp.json` or global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "caido-agent-kit": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/server.js"],
      "env": { "CAIDO_URL": "http://127.0.0.1:8080" }
    }
  }
}
```

Cursor documents tools and prompts as supported MCP capabilities and requests tool approval by default; auto-run should not be recommended for active security tools ([Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol)).

## Community `c0tton-fluff/caido-mcp-server` gap analysis

At commit `4bb6c29` (2026-07-19), the repository is MIT-licensed, Go-based, and uses the community `caido-community/sdk-go` rather than the official TypeScript client. Its README reports **66 tools and six resources** covering HTTP history, Replay, Automate, findings, Sitemap, scopes, projects, workflows, environments, Intercept, Match & Replace, filters, tasks, plugins, WebSockets, conversion, and race-condition sending ([repository and license](https://github.com/c0tton-fluff/caido-mcp-server), [canonical registry](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/internal/tools/register.go), [Go dependencies](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/go.mod)).

Architectural ideas worth reusing conceptually are one file per tool, a canonical registry, bounded schemas, mock GraphQL testing, response fingerprints/diffs, cookie metadata without values, MCP annotations, and a single sensitive-header redaction choke point ([architecture/readme](https://github.com/c0tton-fluff/caido-mcp-server#architecture), [redaction implementation](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/internal/httputil/redact.go), [annotations](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/internal/tools/annotations.go)).

It is not a safe baseline for this specification:

- `RegisterAll` registers read, active, destructive, high-volume, Intercept-drop, deletion, and a race-window tool together; there is no read-only/active registration mode ([registry](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/internal/tools/register.go)).
- `caido_send_request` derives a destination and sends it without first invoking scope evaluation; the separate `caido_is_in_scope` tool is documented as a local approximation, not an enforcement layer ([send handler](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/internal/tools/send_request.go), [scope handler](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/internal/tools/is_in_scope.go)).
- The race-window implementation explicitly bypasses Caido and dials arbitrary targets, which conflicts with the required Caido audit trail and first-release scope ([registry comment](https://github.com/c0tton-fluff/caido-mcp-server/blob/main/internal/tools/register.go)).
- Redaction, length validation, batch caps, 0600 OAuth storage, and annotations are useful controls, but they do not substitute for authorization, mode gating, scope enforcement, deterministic result envelopes, or traffic prompt-injection labeling ([security section](https://github.com/c0tton-fluff/caido-mcp-server#security)).
- API compatibility depends on a separate community Go SDK and generated GraphQL surface. This creates lag and duplication risk relative to the official `@caido/sdk-client`; copying its queries would create a second compatibility burden.

The proposed project should therefore reuse patterns, not source: official TypeScript SDK first, direct GraphQL only behind documented typed adapters, 14 bounded read-only tools initially, active tools registered only in explicit active mode, and no destructive/fuzzing/race tools in the first release.

## Decision record

1. Use Node 24 x64, pnpm, strict TypeScript, stable MCP SDK v1, and `@caido/sdk-client` 0.5.x pinned by lockfile.
2. Treat official Caido Skills as workflow/API research, not as a portable secure-execution layer.
3. Use MCP annotations and schemas for interoperability, but enforce security in server code.
4. Keep stdio as the only initial transport and reserve stdout exclusively for MCP frames.
5. Validate client examples against the linked official pages again at release time because all three clients evolve independently.
