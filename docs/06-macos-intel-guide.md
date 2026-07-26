# Intel macOS Guide

## Requirements

`uname -m` must print `x86_64`; `node -p process.arch` must print `x64`; Node.js
must be 24 or newer. An `arm64` runtime is rejected clearly. Rosetta is not
required.

```bash
uname -m
node --version
node -p process.arch
corepack pnpm install --frozen-lockfile
corepack pnpm build
bash scripts/verify-macos-intel.sh
```

The verifier counts installed pnpm manifests, including scoped packages, and
rejects zero manifests or incompatible `cpu`, `os`, and arm64-only binary
metadata. It checks executable permissions, stdio startup from an absolute path
containing spaces, every stdout JSON-RPC frame, and bounded shutdown. It does
not use `/proc`, assume `/opt/homebrew`, or interpolate child commands through a
shell.

## Paths and User Data

Use absolute paths and one argument-array element per path. User data defaults
to Application Support. Override `CAIDO_TOKEN_CACHE` and `CAIDO_AUDIT_LOG` only
with controlled file paths. An existing credential cache must use mode `0600`.

## CI Evidence Limit

Available hosted macOS runners may be `arm64`; that result does not prove Intel
compatibility. A release requires local verifier output from an `x86_64` host.
