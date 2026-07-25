# Checklist Rilis

## Bukti Kandidat 2026-07-25

Bukti ini diambil pada 2026-07-25 pukul 19:04 WIB dari revisi implementasi `78b7408` (`fix: support direct MCP index execution`). Commit dokumentasi bukti tidak mengubah runtime yang diverifikasi.

## Versi dan Platform

- [x] Revisi `78b7408`; Node `v24.18.0` `x64`; pnpm `10.28.2`; SDK Caido `0.5.0`; MCP SDK `1.29.0`.
- [x] `bash scripts/verify-macos-intel.sh` lulus pada macOS `x86_64` dengan Node `x64`: 289 manifest paket, startup stdio melalui path absolut dengan spasi, stdout hanya frame JSON-RPC, serta izin direktori/file credential `0700`/`0600`.
- [x] Runner macOS `arm64` tidak membuktikan kompatibilitas Intel; bukti di atas berasal dari host `x86_64`.

## Gate Deterministik

- [x] `corepack pnpm install --frozen-lockfile` lulus; lockfile sudah mutakhir.
- [x] `corepack pnpm verify` lulus: format, lint, typecheck, unit, contract, integration, Skill, eval, docs, generated drift, coverage, build, audit tingkat high, secret scan, dan inventaris lisensi.
- [x] `git diff --check` lulus.
- [x] Hasil aktual: unit 180/180; contract 83/83; integration 12/12; Skill 18/18; eval 18/18; docs 8/8; coverage menjalankan 304 lulus dan 1 E2E opt-in diskip.
- [x] Coverage keseluruhan: statements 89,62% (1166/1301), branches 82,80% (756/913), functions 88,83% (342/385), lines 89,88% (1137/1265).
- [x] Branch modul wajib: config 96,55%, auth 100%, redaction 94,11%, dan scope guard 93,02%.
- [x] [MCP Inspector resmi](https://modelcontextprotocol.io/docs/tools/inspector) versi [0.21.2](https://github.com/modelcontextprotocol/inspector/releases) dijalankan melalui `corepack pnpm dlx` yang dipin, tanpa mengubah manifest atau lockfile. Pada mode `read-only` tanpa PAT, Inspector mencatat 14 tool read-only, 4 resource, 4 prompt, dan `caido_health` mengembalikan `ok: true`, `reachable: false`, `authenticated: false`. Tujuh tool aktif sengaja tidak terdaftar pada mode ini.

## Keamanan dan Distribusi

- [x] Secret scan lulus pada 133 file kandidat; generated drift nihil; audit tingkat high lulus; 289 lisensi paket berhasil diinventarisasi.
- [x] Satu advisory transitive tingkat moderate masih terbuka: `GHSA-frvp-7c67-39w9` pada `@hono/node-server@1.19.15` melalui MCP SDK. Dampaknya adalah path traversal `serve-static` pada Windows; server rilis ini memakai stdio lokal pada macOS dan tidak menyajikan static files. Advisory tetap harus ditinjau saat MCP SDK menyediakan upgrade kompatibel.
- [x] Default read-only; active eksplisit; admin tidak destruktif.
- [x] Changelog, LICENSE, SECURITY, dokumentasi klien, roadmap, dan artefak build diperiksa oleh gate docs/build.
- [x] Contoh klien diperiksa oleh tes dokumentasi terhadap sumber resmi bertanggal yang direkam di repositori.

## E2E Nyata

E2E tidak dijalankan otomatis. Bila Caido localhost, project khusus, scope, dan credential operator tersedia, jalankan tepat:

```bash
CAIDO_E2E=1 CAIDO_AGENT_MODE=active CAIDO_PAT='<operator-supplied>' corepack pnpm test:e2e
```

- [x] `corepack pnpm test:e2e` tanpa credential: 3 pemeriksaan guard/harness lulus dan 1 skenario real-Caido diskip.
- [ ] Real-Caido E2E belum dijalankan karena credential operator dan instance Caido lokal khusus tidak disediakan. Perintah di atas adalah satu-satunya gate manual yang tersisa; jangan tandai lulus sebelum output aktual dilampirkan.
