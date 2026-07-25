# Persyaratan Produk

## Tujuan

Menyediakan operasi Caido lokal yang dapat diaudit untuk agen AI tanpa memindahkan otorisasi, kredensial, atau keputusan keamanan ke model.

## Pengguna dan Hasil

Operator berwenang dapat menelusuri bukti secara read-only, lalu menjalankan satu mutasi aktif yang dibatasi bila diperlukan. Hasil selalu memisahkan observasi, penilaian, evidence ID, dan keterbatasan.

## Persyaratan Fungsional

- Stdio lokal, registry berskema ketat, dan output terstruktur.
- Default read-only; active eksplisit; admin tanpa tool destruktif.
- SDK resmi melalui adapter milik proyek.
- Skill tunggal dengan progressive disclosure dan eval deterministik.
- Dukungan Intel macOS dengan Node 24 x64.

## Persyaratan Nonfungsional

Timeout, cancel, rate limit, batas body/batch, redaksi, scope fail-closed, audit bebas rahasia, shutdown bersih, build reproducible, dan gate rilis tanpa network target.

## Di Luar Cakupan

Autonomous exploitation, remote MCP, arbitrary shell/GraphQL, scanning, fuzzing, race, dan penghapusan.
