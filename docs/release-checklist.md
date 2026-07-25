# Checklist Rilis

## Versi dan Platform

- [ ] Catat commit, Node 24.x `x64`, pnpm 10.28.2, SDK 0.5.0, MCP SDK 1.29.0.
- [ ] Jalankan `bash scripts/verify-macos-intel.sh` pada macOS `x86_64` dan lampirkan output.
- [ ] Runner macOS `arm64` tidak membuktikan kompatibilitas Intel.

## Gate Deterministik

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] `corepack pnpm verify`
- [ ] `git diff --check`
- [ ] Catat jumlah test dan coverage aktual tanpa placeholder.
- [ ] Inspector resmi dapat list tool/resource/prompt dan memanggil health dengan aman.

## Keamanan dan Distribusi

- [ ] Tidak ada secret, generated drift, vulnerability high, atau lisensi yang belum direview.
- [ ] Default read-only; active eksplisit; admin tidak destruktif.
- [ ] Changelog, LICENSE, SECURITY, dokumentasi klien, roadmap, dan artefak build diperiksa.
- [ ] Client examples dicek kembali terhadap sumber resmi.

## E2E Nyata

E2E tidak dijalankan otomatis. Bila Caido localhost, project khusus, scope, dan credential operator tersedia, jalankan tepat:

```bash
CAIDO_E2E=1 CAIDO_AGENT_MODE=active CAIDO_PAT='<operator-supplied>' corepack pnpm test:e2e
```

- [ ] Catat passed/failed/skipped aktual. Jika tidak dijalankan, nyatakan “belum dijalankan”; jangan tandai lulus.
