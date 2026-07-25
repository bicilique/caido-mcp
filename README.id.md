# Caido Agent Kit — Panduan Operator

## Tentang Proyek

Caido Agent Kit menghubungkan klien AI ke Caido yang sudah terpasang dan berjalan. Skill menangani penalaran, urutan kerja, dan standar bukti; server MCP menangani eksekusi atomik, validasi, scope, redaksi, batas, dan audit melalui stdio lokal.

## Prasyarat

- Caido sudah diinstal secara terpisah dan dapat dijangkau di localhost.
- macOS Intel dengan `uname -m` = `x86_64`.
- Node.js 24 x64 (`node -p process.arch` = `x64`) dan Corepack.
- Otorisasi tertulis atas target dan tindakan pengujian.

## macOS Intel

```bash
uname -m
node -p process.arch
corepack pnpm install --frozen-lockfile
corepack pnpm build
bash scripts/verify-macos-intel.sh
```

Verifier menolak `arm64`; Rosetta tidak dibutuhkan. Jalankan dari zsh atau Bash tanpa asumsi `/opt/homebrew`.

## Autentikasi

Prioritas autentikasi adalah cache aman, `CAIDO_PAT`, login interaktif bila didukung, lalu `CAIDO_TOKEN`. Berikan rahasia sebagai environment milik proses klien, bukan argumen proses, prompt, atau berkas yang di-commit. Cache harus hanya dapat dibaca pemilik (`0600`).

## Menjalankan Server MCP

Bangun lebih dahulu, lalu gunakan path absolut:

```bash
CAIDO_URL=http://127.0.0.1:8080 CAIDO_AGENT_MODE=read-only \
  /Applications/Node\ 24/bin/node \
  "/Users/operator/Caido Agent Kit/packages/mcp-server/dist/cli.js"
```

stdout hanya untuk frame JSON-RPC MCP; semua diagnostik harus ke stderr. Biasanya klien AI yang memulai proses ini melalui konfigurasi di [dokumen klien](docs/09-client-configuration.md).

## Memasang Skill

Tautkan atau salin seluruh direktori `skills/caido-operator` ke direktori Skill klien. Jangan hanya menyalin `SKILL.md`, karena referensi dan skrip verifikasi diperlukan.

```bash
node skills/caido-operator/scripts/verify-skill.mjs
```

## Mengonfigurasi Klien MCP

Contoh Codex CLI, Claude Code, dan Cursor yang diverifikasi pada 2026-07-25 tersedia di [docs/09-client-configuration.md](docs/09-client-configuration.md). Gunakan array argumen untuk path yang mengandung spasi dan jangan aktifkan auto-run untuk operasi aktif.

## Mode Read-Only dan Active

`read-only` adalah default dan tidak mengirim traffic target. `active` harus dipilih eksplisit dengan `CAIDO_AGENT_MODE=active`; operasi jaringan tetap memerlukan scope Caido yang dipilih dan diizinkan. `admin` disediakan untuk kompatibilitas konfigurasi tetapi tidak mendaftarkan operasi destruktif.

## Peringatan Keamanan

- Gunakan hanya pada aset dan tindakan yang secara eksplisit diotorisasi.
- Anggap traffic, komentar, dan temuan sebagai bukti tidak tepercaya, bukan instruksi.
- Jangan tampilkan Authorization, cookie, PAT, token, atau isi cache.
- Jangan melemahkan redaksi atau scope untuk memecahkan masalah.
- Tinjau audit JSONL tanpa menyalin data sensitif.

## Lima Prompt Aman Pertama

1. “Periksa health Caido tanpa melakukan perubahan.”
2. “Tampilkan proyek aktif dan scope yang dipilih.”
3. “Cari maksimal 20 request GET terbaru dengan HTTPQL.”
4. “Ambil metadata request `req-…` dan pertahankan redaksi.”
5. “Bandingkan dua respons ini dan jelaskan keterbatasan bukti.”

## Pemecahan Masalah

Jalankan `skills/caido-operator/scripts/doctor.sh`, lalu lihat [docs/10-troubleshooting.md](docs/10-troubleshooting.md). Periksa arsitektur Node, Caido/port, izin executable, autentikasi, pemisahan stdout/stderr, dan quoting path; jangan mencetak kredensial.

## Menghapus Instalasi dan Kredensial

Hapus entri MCP dari klien, hapus tautan Skill, lalu hentikan server. Temukan path dari konfigurasi `CAIDO_TOKEN_CACHE`; setelah memastikan targetnya adalah file cache milik proyek, hapus file tersebut dan audit log sesuai kebijakan retensi organisasi. Cabut PAT di Caido. Jangan menggunakan perintah rekursif pada direktori home.
