# Contributing

Thank you for improving Caido Agent Kit. Changes must preserve its narrow,
security-first boundary and remain understandable to operators who are new to
Caido or MCP.

## Before You Start

- Use the project only with explicit authorization.
- Open a public issue for ordinary bugs and proposals.
- Report vulnerabilities privately through [SECURITY.md](SECURITY.md).
- Do not include credentials, cookies, Authorization headers, unredacted
  traffic, customer data, or real target identifiers in issues, tests, commits,
  screenshots, or pull requests.

## Set Up the Repository

Use Intel macOS, Node.js 24 x64, Corepack, and the pinned pnpm version:

```bash
make setup
make build
make doctor
```

The doctor may warn when Caido or a credential is unavailable. Most development
and every deterministic release gate use local fixtures and do not need either.

## Make a Change

1. Keep the change narrowly scoped.
2. Add a failing test before changing behavior.
3. Use the existing module boundaries and descriptive English names.
4. Preserve read-only defaults, scope enforcement, redaction, audit behavior,
   limits, and stable errors.
5. Update user-facing documentation for command, schema, mode, or behavior
   changes.
6. Regenerate tool documentation when the registry changes:

```bash
corepack pnpm generate:tools
corepack pnpm check:generated
```

## Validate

Run the smallest relevant suite during development:

```bash
corepack pnpm test:unit
corepack pnpm test:contract
corepack pnpm test:integration
corepack pnpm test:docs
corepack pnpm typecheck
corepack pnpm lint
```

Before requesting review:

```bash
corepack pnpm format
corepack pnpm verify
git diff --check
```

The credentialed real-Caido E2E is opt-in. Do not run it or claim it passed
without a dedicated local instance, explicit authorization, selected scope, and
an operator-provided credential.

## Pull Requests

Explain:

- the problem and why it matters;
- the chosen solution and alternatives considered;
- security, compatibility, and configuration effects;
- tests and manual validation performed; and
- documentation or generated files changed.

Use concise imperative commit subjects, optionally with Conventional Commit
prefixes. Keep unrelated cleanup out of the pull request.
