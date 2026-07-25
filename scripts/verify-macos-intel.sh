#!/bin/sh
set -eu

fail() {
  printf 'macOS Intel verification failed: %s\n' "$1" >&2
  exit 1
}

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
command -v sw_vers >/dev/null 2>&1 ||
  fail "this verifier must run on macOS (sw_vers was not found)."
host_arch=$(uname -m)
[ "$host_arch" = "x86_64" ] ||
  fail "detected $host_arch; this release requires x86_64 and arm64 does not prove Intel compatibility."
node_arch=$(node -p process.arch)
[ "$node_arch" = "x64" ] ||
  fail "Node reported $node_arch; install an x64 Node build (expected x64)."
node_major=$(node -p 'Number(process.versions.node.split(".")[0])')
[ "$node_major" -ge 24 ] || fail "Node 24 or newer is required."

server="$root/packages/mcp-server/dist/cli.js"
[ -f "$server" ] || fail "missing built server; run corepack pnpm build first."
[ -x "$root/skills/caido-operator/scripts/doctor.sh" ] ||
  fail "doctor.sh is not executable."
[ -x "$root/skills/caido-operator/scripts/verify-skill.mjs" ] ||
  fail "verify-skill.mjs is not executable."
[ -x "$root/skills/caido-operator/scripts/verify-mcp.mjs" ] ||
  fail "verify-mcp.mjs is not executable."

node -e '
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const store = process.argv[1];
for (const entry of readdirSync(store, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const manifest = join(store, entry.name, "node_modules", entry.name.replace(/@[^+]+\\+/g, "@").replace(/\\+.*/, ""), "package.json");
  try {
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    if (Array.isArray(pkg.cpu) && pkg.cpu.includes("arm64") && !pkg.cpu.includes("x64")) {
      throw new Error(`${pkg.name}@${pkg.version} is arm64-only`);
    }
  } catch (error) {
    if (String(error.message).includes("arm64-only")) throw error;
  }
}
' "$root/node_modules/.pnpm" || fail "an installed dependency is arm64-only."

temp_root=$(mktemp -d "${TMPDIR:-/tmp}/caido agent kit.XXXXXX")
trap 'rm -rf "$temp_root"' EXIT HUP INT TERM
spaced_server="$temp_root/server path with spaces.js"
ln -s "$server" "$spaced_server"
CAIDO_AUDIT_LOG="$temp_root/audit log.jsonl" \
CAIDO_TOKEN_CACHE="$temp_root/token cache.json" \
  node "$root/skills/caido-operator/scripts/verify-mcp.mjs" "$spaced_server" >/dev/null

printf 'macOS Intel verification passed: x86_64 host and x64 Node.\n'
printf 'Verified stdio startup through an absolute path containing spaces.\n'
printf 'Verified stdout contains JSON-RPC frames only; diagnostics remain on stderr.\n'
