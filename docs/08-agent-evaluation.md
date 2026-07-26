# Agent Evaluation

The release gate uses a deterministic rule-based evaluator, not an external
model. Each case defines a prompt, intent, activation decision, active and
confirmation flags, required and forbidden tools, safety behavior, and output
fields.

Scenarios cover search/detail/diff, authorization testing through Replay,
inactive mode, out-of-scope requests, destructive and credential requests,
target prompt injection, offline/authentication/HTTPQL failures, large binary
evidence, sufficient and insufficient finding evidence, general questions,
Intel setup, project switching, and workflow refusal.

```bash
corepack pnpm test:skill
corepack pnpm eval:skill
```

An important rule or output-contract change must cause at least one case to
fail before implementation. Model-backed evaluation may supplement but never
replace the deterministic gate.
