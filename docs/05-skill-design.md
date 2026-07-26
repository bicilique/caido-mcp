# Skill Design

`caido-operator` is one portable Skill. Its frontmatter supports discovery. Its
main instructions define activation boundaries, preconditions,
authorization/scope rules, untrusted-traffic handling, a read-only-first flow,
deterministic decisions, evidence format, recovery, examples, anti-examples,
and reference routing.

HTTPQL, Replay, findings, active testing, Intel setup, and troubleshooting
details load from `references/` only when needed. The Skill contains no SDK
client, credential, shell execution, or duplicate tool catalog.

Static validation checks frontmatter, links, and progressive-disclosure size.
Deterministic cases test activation, active gates, credential protection,
prompt injection, scope, tool selection, and output fields.
