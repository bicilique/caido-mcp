## Problem

Explain the user or engineering problem.

## Solution

Describe the bounded solution and important alternatives.

## Security and compatibility

Describe effects on authorization, operating modes, scope, redaction, audit,
credentials, outbound traffic, Caido/SDK versions, and client configuration.

Do not include credentials, secrets, cookies, Authorization headers, unredacted
traffic, customer data, or real target identifiers.

## Validation

List exact test, lint, type-check, generated-file, documentation, and manual
validation commands. State explicitly when real-Caido E2E was not run.

## Checklist

- [ ] I added a failing test before changing behavior.
- [ ] I ran the focused tests.
- [ ] I ran `corepack pnpm verify`.
- [ ] I updated documentation and generated files when required.
- [ ] I preserved read-only defaults and security boundaries.
- [ ] I removed secrets and live target data from this pull request.
