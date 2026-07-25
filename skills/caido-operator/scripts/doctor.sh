#!/bin/sh
set -eu

fail() {
  printf 'caido-operator doctor: %s\n' "$1" >&2
  exit 1
}

mode_of() {
  stat -f '%Lp' "$1" 2>/dev/null || stat -c '%a' "$1"
}

check_private_path() {
  label=$1
  path=$2
  required=${3:-1}
  [ -n "$path" ] || return 0
  case "$path" in
  /*) ;;
  *) fail "$label path must be absolute." ;;
  esac
  directory=$(dirname -- "$path")
  [ -d "$directory" ] || fail "$label parent directory does not exist."
  [ "$(mode_of "$directory")" = "700" ] ||
    fail "$label parent directory must have mode 700."
  if [ ! -f "$path" ]; then
    [ "$required" = "0" ] && return 0
    fail "$label file does not exist."
  fi
  [ "$(mode_of "$path")" = "600" ] ||
    fail "$label file must have mode 600."
}

[ "$(uname -m)" = "x86_64" ] || fail "macOS Intel requires uname -m = x86_64."
[ "$(node -p process.arch)" = "x64" ] || fail "Node must be the x64 build."
node_major=$(node -p 'Number(process.versions.node.split(".")[0])')
[ "$node_major" -ge 24 ] || fail "Node 24 or newer is required."
command -v corepack >/dev/null 2>&1 || fail "corepack was not found."

check_private_path "CAIDO_TOKEN_CACHE" "${CAIDO_TOKEN_CACHE:-}" 0
check_private_path "CAIDO_AUDIT_LOG" "${CAIDO_AUDIT_LOG:-}"

printf 'caido-operator doctor passed: x86_64 host, x64 Node %s.\n' "$(node --version)"
