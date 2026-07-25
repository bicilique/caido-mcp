# Analisis Kesenjangan

Status sumber diverifikasi pada 2026-07-25; rincian dan tautan primer ada di [research-current-sources.md](research-current-sources.md).

## Kemampuan Resmi

Caido menyediakan SDK TypeScript resmi untuk autentikasi, project, scope, request, finding, workflow, filter, dan Replay. Caido 0.57.1 menyediakan artefak macOS `x86_64`. Agent Skills memberi struktur portabel untuk instruksi progresif.

## Referensi Komunitas

Server MCP komunitas menunjukkan pola registry dan katalog luas, tetapi menyatukan operasi destruktif/aktif, memakai SDK tidak resmi, dan tidak memenuhi batas scope serta mode proyek ini.

## Dipakai Secara Konseptual

HTTPQL server-side, hasil berbatas, evidence ID, registry kanonik, anotasi MCP, fingerprint respons, serta choke point redaksi dipakai sebagai pola—bukan menyalin implementasi.

## Diimplementasikan

SDK adapter resmi, stdio lokal, 14 tool baca, tujuh tool aktif bergate, enam resources, prompt aman, cache owner-only, redaksi/scope/audit terpusat, eval deterministik, dan pengujian mock.

## Ditunda

Penghapusan, scanning/fuzzing volume tinggi, race tooling, arbitrary GraphQL/plugin RPC, override scope, dan transport remote berada hanya di [roadmap](roadmap.md).

## Risiko

Skema GraphQL Caido tidak dijamin stabil dan versi SDK/instance bisa tidak cocok. Duplikasi dihindari dengan satu adapter, satu registry tool, dan dokumentasi tool yang dihasilkan. Client AI juga dapat mengubah sintaks konfigurasi setelah tanggal verifikasi.
