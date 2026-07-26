# Release Checklist

## Candidate Evidence: 2026-07-25

This evidence was collected on 2026-07-25 at 19:16 WIB from implementation
revision `8234336` (`fix: canonicalize direct MCP entrypoints`). The evidence
documentation commit did not change the verified runtime.

## Versions and Platform

- [x] Revision `8234336`; Node `v24.18.0` `x64`; pnpm `10.28.2`; Caido SDK `0.5.0`; MCP SDK `1.29.0`.
- [x] `bash scripts/verify-macos-intel.sh` passed on macOS `x86_64` with Node `x64`: 289 package manifests, stdio startup through an absolute path with spaces, JSON-RPC-only stdout, and credential directory/file permissions `0700`/`0600`.
- [x] An `arm64` macOS runner does not prove Intel compatibility; the evidence above came from an `x86_64` host.

## Deterministic Gates

- [x] `corepack pnpm install --frozen-lockfile` passed with a current lockfile.
- [x] `corepack pnpm verify` passed format, lint, typecheck, unit, contract, integration, Skill, evaluation, docs, generated drift, coverage, build, high-severity audit, secret scan, and license inventory.
- [x] `git diff --check` passed.
- [x] Actual results: unit 181/181; contract 84/84; integration 12/12; Skill 18/18; evaluation 18/18; docs 8/8; coverage ran 306 passing tests and skipped one opt-in E2E.
- [x] Overall coverage: statements 89.62% (1166/1301), branches 82.80% (756/913), functions 88.83% (342/385), lines 89.88% (1137/1265).
- [x] Required module branch coverage: config 96.55%, auth 100%, redaction 94.11%, and scope guard 93.02%.
- [x] Official [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) version [0.21.2](https://github.com/modelcontextprotocol/inspector/releases) ran through pinned `corepack pnpm dlx` without changing the manifest or lockfile. In `read-only` mode without a PAT it recorded 14 read tools, 4 resources, 4 prompts, and `caido_health` returned `ok: true`, `reachable: false`, and `authenticated: false`. Health also passed when the entry point was an absolute symlink containing spaces. Seven active tools were intentionally absent.

## Security and Distribution

- [x] Secret scanning passed across 133 candidate files; generated drift was zero; the high-severity audit passed; 289 package licenses were inventoried.
- [x] One moderate transitive advisory remains open: `GHSA-frvp-7c67-39w9` in `@hono/node-server@1.19.15` through the MCP SDK. It affects Windows `serve-static` path traversal; this release uses local stdio on macOS and serves no static files. Review it when a compatible MCP SDK upgrade becomes available.
- [x] Read-only is the default; active mode is explicit; admin is non-destructive.
- [x] Changelog, LICENSE, SECURITY, client documentation, roadmap, and build artifacts are checked by docs/build gates.
- [x] Dated official sources support the client examples.

## Real-Caido E2E

E2E does not run automatically. With a dedicated local Caido instance, project,
scope, explicit authorization, and operator credential, run exactly:

```bash
CAIDO_E2E=1 CAIDO_AGENT_MODE=active CAIDO_PAT='<operator-supplied>' corepack pnpm test:e2e
```

- [x] `corepack pnpm test:e2e` without a credential: three guard/harness checks passed and one real-Caido scenario skipped.
- [ ] Real-Caido E2E has not run because no dedicated local instance and operator credential were provided. Do not mark it passed until actual output is attached.
