# Konfigurasi Klien

Diverifikasi terhadap dokumentasi resmi pada **2026-07-25**; tautan primer ada di [research-current-sources.md](research-current-sources.md). Periksa ulang saat rilis karena sintaks klien dapat berubah. Contoh memakai `/Applications/Node 24/bin/node` dan `/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js` untuk membuktikan absolute path dengan spasi tetap satu argumen.

Jangan menaruh PAT/token pada argumen. Simpan sebagai environment privat klien. stdout server hanya JSON-RPC; diagnostik harus di stderr.

## Codex CLI

```bash
codex mcp add caido-agent-kit \
  --env CAIDO_URL=http://127.0.0.1:8080 \
  --env CAIDO_AGENT_MODE=read-only \
  -- "/Applications/Node 24/bin/node" \
  "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js"
codex mcp list
```

Persistent config berada di `~/.codex/config.toml` atau `.codex/config.toml` proyek tepercaya; `command` dan setiap `args` harus terpisah.

## Claude Code

```bash
claude mcp add --transport stdio caido-agent-kit \
  --env CAIDO_URL=http://127.0.0.1:8080 \
  --env CAIDO_AGENT_MODE=read-only \
  -- "/Applications/Node 24/bin/node" \
  "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js"
claude mcp get caido-agent-kit
```

Separator `--` wajib sebelum command server. Pilih scope local/project/user secara sengaja.

## Cursor

`.cursor/mcp.json`:

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
        "CAIDO_AGENT_MODE": "read-only"
      }
    }
  }
}
```

Cursor meminta approval tool secara default. Auto-run jangan diaktifkan untuk tool keamanan aktif.
