# Testing Strategy

Behavior changes follow RED–GREEN–REFACTOR. Unit tests cover configuration,
errors/results, authentication/cache, redaction, bodies, fingerprints, scope,
rate limits, and audit behavior. Contract tests cover registries, schemas,
resources, prompts, stdio, scripts, and Intel constraints. Integration tests
exercise the runtime and real adapter against a mock local Caido server.
Real-Caido E2E is opt-in and rejects non-loopback targets.

```bash
corepack pnpm test:unit
corepack pnpm test:contract
corepack pnpm test:integration
corepack pnpm test:skill
corepack pnpm eval:skill
corepack pnpm test:docs
corepack pnpm coverage
```

Global branch, function, line, and statement thresholds are 80%. The release
checklist records actual evidence. E2E is not a default gate because it requires
a local Caido instance and an operator credential.
