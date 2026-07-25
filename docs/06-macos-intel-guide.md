# Panduan macOS Intel

## Persyaratan

`uname -m` harus menghasilkan `x86_64`; `node -p process.arch` harus `x64`; Node minimal 24. Arsitektur `arm64` ditolak dengan jelas. Rosetta tidak wajib dan tidak diperlukan.

```bash
uname -m
node --version
node -p process.arch
corepack pnpm install --frozen-lockfile
corepack pnpm build
bash scripts/verify-macos-intel.sh
```

Skrip memeriksa arsitektur host/Node, dependency arm64-only, izin executable, startup stdio dari absolute path yang mengandung spasi, dan kemurnian JSON-RPC stdout. Ia tidak memakai `/proc`, tidak mengasumsikan `/opt/homebrew`, dan memanggil child process sebagai array argumen tanpa shell interpolation.

## Path dan Data Pengguna

Gunakan path absolut dan satu elemen argumen per path. Default data mengikuti Application Support milik user; override `CAIDO_TOKEN_CACHE` dan `CAIDO_AUDIT_LOG` hanya dengan path file yang terkontrol. Cache yang ada harus mode `0600`.

## Batas Bukti CI

Runner macOS hosted yang tersedia dapat berupa `arm64`; hasil itu tidak membuktikan kompatibilitas Intel. Rilis memerlukan output lokal verifier pada host `x86_64`.
