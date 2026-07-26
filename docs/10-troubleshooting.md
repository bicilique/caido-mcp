# Troubleshooting

Start with:

```bash
make doctor
```

Then use this table. Do not disable redaction or scope enforcement to diagnose
a problem.

| Symptom                                | Safe diagnosis and recovery                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| Wrong Node architecture                | Run `node -p process.arch`; install x64 rather than arm64                       |
| Wrong Node version                     | Use Node.js 24 or newer, then restart the client                                |
| Command not found                      | Use the absolute paths printed by `command -v node` and the config helper       |
| Missing server entry point             | Run `make build`; confirm `packages/mcp-server/dist/cli.js` exists              |
| Gatekeeper or executable permission    | Review artifact provenance before applying `chmod +x` to a specific script      |
| Port conflict or stopped Caido         | Check the local listener and `CAIDO_URL`; start Caido                           |
| Authentication or cache failure        | Check owner-only permissions; revoke and replace the PAT without printing it    |
| Stdio startup failure                  | Build first, use absolute argument-array paths, and separate stdout from stderr |
| Logs appear on stdout                  | Remove ordinary stdout logging; stdout is JSON-RPC only                         |
| Path with spaces breaks                | Keep the entire path in one quoted argument or one array element                |
| `INVALID_HTTPQL`                       | Simplify the query and use the HTTPQL reference                                 |
| Timeout or malformed upstream response | Do not retry mutations automatically; check SDK/instance compatibility          |

After transport starts, ask for `caido_health`. If authentication remains
unavailable, never paste the credential into chat. Confirm only that the client
environment forwards `CAIDO_PAT`, then rotate it if validity is uncertain.
