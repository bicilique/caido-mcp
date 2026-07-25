# macOS Intel

Require `uname -m` = `x86_64`, `node -p process.arch` = `x64`, and the Node version declared by the project manifest (currently 24+). Do not require Rosetta or assume `/opt/homebrew`; Intel Homebrew commonly uses `/usr/local`. Quote absolute paths containing spaces. The MCP server is stdio: stdout is JSON-RPC only and diagnostics belong on stderr. If stdio cannot initialize, separate and inspect process stdout/stderr before attempting `caido_health`.
