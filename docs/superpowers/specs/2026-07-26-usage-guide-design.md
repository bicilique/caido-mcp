# Bahasa Indonesia Usage Guide Design

**Date:** 2026-07-26
**Status:** Approved design
**Deliverable:** `docs/usage-guide-id.md`

## Purpose

Add a detailed Bahasa Indonesia operational guide for people connecting
`caido-agent-kit` to an existing local Caido instance. The guide is the
operator-facing path from prerequisites through safe first use. Contributor
commands are included only as a short validation section.

## Audience and Scope

The primary reader operates Caido and wants to expose the kit to Codex, Claude
Code, or Cursor through local stdio MCP. The reader may not know the repository
layout or its security defaults.

The guide covers:

- Intel macOS, Node.js 24 x64, pnpm 10.28.2, and Caido prerequisites.
- Repository installation and build commands that exist in the current
  manifests.
- Secret-safe PAT and environment configuration.
- The `read-only`, `active`, and reserved `admin` registration modes.
- Local stdio MCP configuration for Codex, Claude Code, and Cursor.
- Installation and activation of the portable `caido-operator` skill.
- Safe first-run checks and example investigation workflows.
- Scope enforcement, redaction, bounded output, and audit behavior.
- Troubleshooting and contributor validation.

The guide does not document installing Caido itself in depth, remote MCP
transport, destructive tools, arbitrary GraphQL or shell execution, scanning,
fuzzing, or other deferred capabilities.

## Structure

The guide follows one end-to-end operator journey:

1. Explain what the kit does and its current capability boundary.
2. Verify platform and software prerequisites.
3. Install dependencies and build the workspace.
4. Prepare a running Caido instance and obtain credentials without placing
   secrets in committed files or process arguments.
5. Configure environment variables, beginning in `read-only` mode.
6. Configure one supported AI client using an absolute local executable path.
7. Install or link the operator skill.
8. Validate MCP discovery and run a safe health/read workflow.
9. Explain how and when to opt into `active` mode.
10. Provide troubleshooting and repository-validation commands.

Each client configuration is a self-contained subsection, while shared setup
and security guidance appears only once.

## Accuracy and Safety Rules

- Every command must correspond to a committed manifest, source entry point, or
  clearly identified prerequisite.
- If the current repository cannot yet perform a documented runtime step, the
  guide must label that limitation instead of presenting an aspirational
  command as working.
- Examples use placeholders and environment variables for secrets; no example
  embeds a token.
- The default path is read-only. Active mode requires explicit authorization,
  a configured Caido scope, and an explanation of audit behavior.
- Captured traffic is described as untrusted evidence, never as instructions
  for the agent.
- Client configuration uses local stdio and absolute paths, including safe
  handling of paths containing spaces.

## Validation

Documentation validation consists of:

- Checking every referenced file and package script against the repository.
- Scanning for placeholders that could be mistaken for real credentials.
- Running Markdown-oriented repository checks if available.
- Running the existing generated-document contract test when the guide refers
  to generated tool documentation.
- Reviewing the final diff for unsupported or unsafe claims.
