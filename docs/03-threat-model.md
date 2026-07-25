# Model Ancaman

## Batas Kepercayaan

Operator dan konfigurasi lokal berada di sisi tepercaya hanya setelah otorisasi. Model, traffic, komentar, file input, respons Caido, dan teks target tidak tepercaya.

## Ancaman dan Mitigasi

| Ancaman                                         | Kontrol                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Credential/token theft atau disclosure ke model | Environment/cache `0600`, tanpa argumen, redaksi rekursif, error dan audit tersanitasi |
| Prompt injection dari traffic                   | Ditandai sebagai evidence tidak tepercaya; Skill melarang mengikuti instruksi target   |
| Request out-of-scope                            | Normalisasi URL, selected Caido scope, deny precedence, ambiguity fail-closed          |
| Mutasi tanpa audit durable                      | Intent event wajib sebelum handler aktif; kegagalan menghasilkan `AUDIT_UNAVAILABLE`   |
| Final audit gagal setelah mutasi                | Evidence dipertahankan dengan warning non-retry agar mutasi tidak terduplikasi         |
| Workflow dengan target outbound tersembunyi     | `caido_run_workflow` fail-closed dengan `TOOL_DISABLED`; adapter tidak dipanggil       |
| Destructive action                              | Tidak ada tool destruktif; admin tidak menambah capability                             |
| Fuzzing/traffic berlebihan                      | Batas batch/rate/body/timeout dan satu mutasi per panggilan                            |
| Log leakage                                     | Audit JSONL bebas header/body/secret; stdout hanya MCP                                 |
| File/path traversal atau symlink                | Cache menolak symlink/izin tidak aman dan memakai path user eksplisit                  |
| Malicious file input                            | Tidak ada arbitrary file tool; input berskema dan berbatas                             |
| MCP stdio corruption                            | JSON-RPC saja di stdout; diagnostik ke stderr; contract startup                        |
| Dependency/supply chain                         | Lockfile frozen, audit high, secret scan, license inventory, official actions          |

## Active Mode dan Keterbatasan

Active mode harus eksplisit tetapi bukan pengganti otorisasi. Audit tidak membuktikan keamanan target. Kompatibilitas Caido SDK/instance dan integritas host tetap menjadi risiko residual.

## Pelaporan

Ikuti prosedur privat di [SECURITY.md](../SECURITY.md); jangan sertakan kredensial atau data target.
