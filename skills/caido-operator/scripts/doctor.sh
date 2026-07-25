#!/bin/sh
set -eu

fail() {
  printf 'caido-operator doctor: %s\n' "$1" >&2
  exit 1
}

[ "$(uname -m)" = "x86_64" ] || fail "macOS Intel requires uname -m = x86_64."
[ "$(node -p process.arch)" = "x64" ] || fail "Node must be the x64 build."
node_major=$(node -p 'Number(process.versions.node.split(".")[0])')
[ "$node_major" -ge 24 ] || fail "Node 24 or newer is required."
command -v corepack >/dev/null 2>&1 || fail "corepack was not found."

if [ -n "${CAIDO_TOKEN_CACHE:-}" ] && [ -e "$CAIDO_TOKEN_CACHE" ]; then
  mode=$(stat -f '%Lp' "$CAIDO_TOKEN_CACHE" 2>/dev/null || stat -c '%a' "$CAIDO_TOKEN_CACHE")
  [ "$mode" = "600" ] || fail "CAIDO_TOKEN_CACHE must have mode 600."
fi

printf 'caido-operator doctor passed: x86_64 host, x64 Node %s.\n' "$(node --version)"
