# Strategi Pengujian

RED–GREEN–REFACTOR berlaku untuk perubahan perilaku. Unit menguji konfigurasi, error/result, auth/cache, redaksi, body, fingerprint, scope, rate, dan audit. Contract menguji registry/schema/resource/prompt/stdio/Intel. Integration menembus runtime dan adapter ke mock Caido localhost. E2E nyata opt-in dan menolak target non-loopback.

```bash
corepack pnpm test:unit
corepack pnpm test:contract
corepack pnpm test:integration
corepack pnpm test:skill
corepack pnpm eval:skill
corepack pnpm test:docs
corepack pnpm coverage
```

Threshold umum branch/function/line/statement adalah 80%; Task rilis akhir mencatat bukti aktual. E2E bukan gate default karena membutuhkan Caido dan kredensial operator.
