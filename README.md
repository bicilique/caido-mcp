# Caido Agent Kit

Caido Agent Kit is a local, security-first bridge between AI coding clients and an already-running Caido instance. It combines one portable Agent Skill for operating judgment with a typed local stdio MCP server for bounded execution.

The default `read-only` mode exposes inspection tools. The explicit `active` mode adds seven scoped, atomic mutations. The reserved `admin` mode does not register destructive tools. Captured traffic is always untrusted evidence; credentials are redacted, active network operations fail closed on scope ambiguity, and audit events omit secrets.

## Requirements

- Intel macOS: `uname -m` reports `x86_64`.
- Node.js 24 x64 and Corepack/pnpm 10.28.2.
- A separately installed and running Caido instance.

## Quick start

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
CAIDO_URL=http://127.0.0.1:8080 CAIDO_AGENT_MODE=read-only \
  node "$(pwd)/packages/mcp-server/dist/cli.js"
```

Keep `CAIDO_PAT` or `CAIDO_TOKEN` in the client environment, never in command arguments or committed configuration. See [the Indonesian operator guide](README.id.md), [client configuration](docs/09-client-configuration.md), and [security policy](SECURITY.md).

## Verification

```bash
corepack pnpm verify
bash scripts/verify-macos-intel.sh
```

Real-Caido E2E is intentionally opt-in and localhost-only; see the [release checklist](docs/release-checklist.md). This project is not a scanner, fuzzer, shell bridge, or authorization substitute.
