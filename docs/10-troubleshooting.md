# Pemecahan Masalah

| Gejala                     | Diagnosis aman                                                              |
| -------------------------- | --------------------------------------------------------------------------- |
| Node salah arsitektur      | `node -p process.arch`; instal build `x64`, bukan `arm64`                   |
| `command not found`        | Pakai absolute path hasil `command -v node`/`command -v corepack`           |
| Gatekeeper/izin executable | Periksa provenance artefak dan `chmod +x` hanya pada skrip yang direview    |
| Port konflik/Caido mati    | Periksa listener localhost dan `CAIDO_URL`; mulai Caido                     |
| Auth/cache gagal           | Periksa permission `0600`; cabut dan buat PAT baru tanpa mencetak nilainya  |
| Stdio startup gagal        | Jalankan build, cek absolute path, pisahkan stdout dan stderr               |
| Log masuk stdout           | Hapus log biasa dari stdout; JSON-RPC saja di sana                          |
| Path dengan spasi rusak    | Gunakan quote atau elemen array argumen terpisah, tanpa shell interpolation |
| `INVALID_HTTPQL`           | Sederhanakan query dan rujuk dokumentasi HTTPQL                             |
| Timeout/upstream malformed | Jangan retry mutasi otomatis; periksa versi SDK/instance                    |

Mulai dengan `skills/caido-operator/scripts/doctor.sh`, lalu `caido_health`. Jangan menonaktifkan redaksi atau scope untuk diagnosis.
