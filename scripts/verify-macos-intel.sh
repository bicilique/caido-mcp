#!/bin/sh
set -eu

fail() {
  printf 'macOS Intel verification failed: %s\n' "$1" >&2
  exit 1
}

default_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
root=${CAIDO_VERIFY_ROOT:-$default_root}
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

store=${CAIDO_VERIFY_PNPM_STORE:-"$root/node_modules/.pnpm"}
dependency_result=$(node "$root/scripts/verify-installed-packages.mjs" "$store") ||
  fail "installed dependency verification failed."

temp_root=$(mktemp -d "${TMPDIR:-/tmp}/caido agent kit.XXXXXX")
chmod 700 "$temp_root"
trap 'rm -rf "$temp_root"' EXIT HUP INT TERM
spaced_server="$temp_root/server path with spaces.js"
ln -s "$server" "$spaced_server"
CAIDO_AUDIT_LOG="$temp_root/audit log.jsonl" \
CAIDO_TOKEN_CACHE="$temp_root/token cache.json" \
CAIDO_VERIFY_SENTINEL="${CAIDO_VERIFY_SENTINEL:-}" \
  node "$root/skills/caido-operator/scripts/verify-mcp.mjs" "$spaced_server" >/dev/null
CAIDO_AUDIT_LOG="$temp_root/audit log.jsonl" \
CAIDO_TOKEN_CACHE="$temp_root/token cache.json" \
  "$root/skills/caido-operator/scripts/doctor.sh" >/dev/null

printf 'macOS Intel verification passed: x86_64 host and x64 Node.\n'
printf 'Installed package manifests: %s\n' "$(printf '%s' "$dependency_result" | sed 's/ .*//')"
printf 'Verified stdio startup through an absolute path containing spaces.\n'
printf 'Verified stdout contains JSON-RPC frames only; diagnostics remain on stderr.\n'
printf 'Verified credential paths and permissions (0700 directories, 0600 files).\n'
