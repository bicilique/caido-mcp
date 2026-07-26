# Client Configuration

Verified against official client documentation on **2026-07-25**; primary
links are recorded in
[research-current-sources.md](research-current-sources.md). Recheck syntax for
new releases because clients evolve.

The easiest safe path is:

```bash
make config CLIENT=codex
make config CLIENT=claude
make config CLIENT=cursor
```

Run only the command for your client. It prints a template with the current
absolute Node and repository paths, and never writes configuration or embeds a
credential.

The static examples below use `/Applications/Node 24/bin/node` and
`/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js` to prove that
an absolute path containing spaces remains one argument.

Never place a PAT or token in process arguments. Keep it in the client's
private environment. Server stdout contains JSON-RPC only; diagnostics belong
on stderr. Do not enable auto-run for active security tools.

## Codex CLI

Codex uses `~/.codex/config.toml` or `.codex/config.toml` in a trusted project:

```toml
[mcp_servers.caido_agent_kit]
command = "/Applications/Node 24/bin/node"
args = ["/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js"]
env_vars = ["CAIDO_PAT"]
env = {
  CAIDO_URL = "http://127.0.0.1:8080",
  CAIDO_AGENT_MODE = "read-only",
  CAIDO_REQUIRE_SCOPE = "true",
  CAIDO_ALLOW_SENSITIVE_HEADERS = "false"
}
```

Restart Codex, then run `codex mcp list` or use `/mcp` in the TUI.

## Claude Code

Place a reviewed configuration in `.mcp.json` at the intended Claude Code
scope. Keep the credential as an environment reference:

```json
{
  "mcpServers": {
    "caido-agent-kit": {
      "command": "/Applications/Node 24/bin/node",
      "args": [
        "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js"
      ],
      "env": {
        "CAIDO_URL": "http://127.0.0.1:8080",
        "CAIDO_AGENT_MODE": "read-only",
        "CAIDO_REQUIRE_SCOPE": "true",
        "CAIDO_PAT": "${CAIDO_PAT}"
      }
    }
  }
}
```

Restart Claude Code, then run `claude mcp get caido-agent-kit`.

## Cursor

Use `.cursor/mcp.json` in a trusted project:

```json
{
  "mcpServers": {
    "caido-agent-kit": {
      "command": "/Applications/Node 24/bin/node",
      "args": [
        "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js"
      ],
      "env": {
        "CAIDO_URL": "http://127.0.0.1:8080",
        "CAIDO_AGENT_MODE": "read-only",
        "CAIDO_REQUIRE_SCOPE": "true",
        "CAIDO_PAT": "${env:CAIDO_PAT}"
      }
    }
  }
}
```

Cursor asks for tool approval by default. Keep that approval boundary for
active operations.

## Verification

After restarting the client:

1. Inspect the client's MCP status.
2. Ask only for `caido_health`.
3. Confirm the reported mode is `read-only`.
4. Confirm stdout contains no diagnostic lines.
5. Continue with the first task in [Getting Started](getting-started.md).
