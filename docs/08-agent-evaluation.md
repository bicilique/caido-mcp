# Evaluasi Agen

Gate rilis memakai evaluator rule-based deterministik, bukan model eksternal. Setiap case berisi prompt, intent, activation, active/confirmation flags, tool wajib/terlarang, safety behavior, dan output fields.

Dua puluh skenario mencakup pencarian/detail/diff, IDOR via Replay, mode nonaktif, out-of-scope, permintaan destruktif/credential, prompt injection target, offline/auth/HTTPQL failure, binary besar, evidence finding cukup/tidak cukup, pertanyaan umum, Intel, project switch, dan workflow.

```bash
corepack pnpm test:skill
corepack pnpm eval:skill
```

Perubahan rule penting atau contract output harus membuat setidaknya satu case gagal. Model-backed evaluation boleh ditambah kelak tetapi tidak menggantikan gate deterministik.
