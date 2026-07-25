# Katalog Tool

Sumber kanonik nama, mode, side effect, input/output schema, annotation, error, scope, redaksi, contoh intent, dan misuse warning adalah registry MCP.

Katalog lengkap dihasilkan ke [tool-selection.md](../skills/caido-operator/references/tool-selection.md). Jalankan:

```bash
corepack pnpm generate:tools
corepack pnpm check:generated
```

Read-only berisi health, project, scope, request/diff, sitemap, finding, Replay
session, workflow, dan filter. Active menambah select project, Replay/raw send
berbatas dan bergate scope, create/update finding, serta Intercept toggle.
`caido_run_workflow` tetap tercantum agar kegagalan bersifat stabil, tetapi
selalu fail-closed dengan `TOOL_DISABLED` karena seluruh target outbound
workflow tidak dapat diinspeksi sebelum eksekusi. Admin tidak menambahkan tool.
