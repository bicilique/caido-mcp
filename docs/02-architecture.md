# Arsitektur

## Konteks dan Komponen

`AI client → stdio MCP server → shared execution pipeline → CaidoAdapter → official SDK → local Caido`.

Skill mengarahkan keputusan operator. `packages/mcp-server` memiliki transport, registry, handler, resource, dan prompt. `packages/core` memiliki konfigurasi, auth/cache, adapter, scope, redaksi, rate limit, result, dan audit.

## Aliran Data dan Autentikasi

Runtime membaca konfigurasi, membuka cache owner-only, lalu SDK memakai cache, PAT, login interaktif, atau direct token sesuai prioritas. Rahasia tidak menjadi input tool. Respons SDK divalidasi dan dipetakan ke tipe proyek.

## Siklus Tool Call

Schema validation → timeout/cancel → rate token → selected project → normalisasi destination dan scope (untuk jaringan aktif) → tepat satu adapter call → redaksi/body bound → audit → result envelope.

## Aliran Scope, Redaksi, dan Error

Deny menang atas allow; ambiguity gagal tertutup. Serializer bersama menangani tool dan resource. Error upstream dinormalisasi ke kode stabil tanpa teks mentah.

## Arsitektur Pengujian

Unit menguji core; contract menguji MCP/stdio/schema; integration memakai server Caido lokal palsu melalui adapter nyata; E2E opt-in memakai Caido localhost; eval Skill bersifat statis/deterministik.
