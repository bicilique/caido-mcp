# Tool Catalog

The MCP registry is the canonical source for tool names, modes, side effects,
schemas, annotations, errors, scope behavior, redaction, example intent, and
misuse warnings.

The complete catalog is generated into
[tool-selection.md](../skills/caido-operator/references/tool-selection.md):

```bash
corepack pnpm generate:tools
corepack pnpm check:generated
```

Read-only mode covers health, projects, scopes, requests and response
comparison, Sitemap, findings, Replay sessions, workflows, and filters. Active
mode adds project selection, bounded scope-gated Replay/raw send,
create/update-finding, and Intercept toggle. `caido_run_workflow` remains
cataloged for stable failure behavior but always fails closed with
`TOOL_DISABLED`, because its complete outbound targets cannot be inspected
before execution. Admin mode adds no tools.
