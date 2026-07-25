# README and Git Ignore Design

**Date:** 2026-07-25  
**Status:** Approved design

## Goal

Turn the root README into a professional, security-first landing page for
`bicilique/caido-mcp`, while keeping every compatibility, verification, and
release claim aligned with evidence already recorded in the repository.
Tighten `.gitignore` so local credentials, caches, IDE metadata, build output,
and temporary files cannot be committed accidentally.

## README Structure

The English README remains the primary landing page and links prominently to
`README.id.md` for the complete Indonesian operator guide.

The page will use this order:

1. Project title, concise security-first tagline, and verified badges.
2. A short explanation of the Skill/MCP separation and intended audience.
3. Security guarantees and explicit non-goals.
4. A Mermaid architecture diagram:
   AI client → Agent Skill → local stdio MCP → security pipeline → Caido.
5. A mode matrix for `read-only`, `active`, and reserved `admin`.
6. Requirements and a copyable quick start.
7. Client and Skill setup links.
8. Verification commands and current evidence.
9. Real-Caido E2E status, limitations, roadmap, security policy, and license.

## Visual Language

- Use restrained badges for CI, MIT, Node 24, MCP, and macOS Intel.
- Use tables and one Mermaid diagram only where they reduce reading effort.
- Avoid decorative screenshots, emoji-heavy headings, animated assets, or
  badges that make unverifiable claims.
- Use concise prose and security terminology already established by the
  project.

## Evidence Rules

- The CI badge targets the `ci.yml` workflow in `bicilique/caido-mcp`.
- Coverage is described using the verified release evidence, not a dynamic
  third-party badge.
- Inspector, Intel, test, and coverage counts must match
  `docs/release-checklist.md`.
- The credentialed real-Caido E2E remains explicitly opt-in and is never marked
  as passed without operator-supplied evidence.
- The remaining moderate transitive advisory remains disclosed through the
  release checklist.

## Git Ignore Policy

Keep ignoring dependencies, builds, coverage, local worktrees, local Serena
metadata, logs, and macOS metadata. Add narrowly scoped entries for:

- `.env*`, while allowing committed `!.env.example`;
- pnpm/local tool caches and TypeScript incremental state;
- JetBrains and VS Code personal metadata;
- local Caido audit/token-cache paths;
- editor swap/backup files and temporary directories.

Do not ignore source code, tests, documentation, workflow configuration,
lockfiles, generated tool documentation, examples, or release evidence.

## Validation

- Documentation tests must continue to pass.
- Prettier, lint, generated-file checks, secret scan, and `git diff --check`
  must remain green.
- A clean-status check must show no accidental local artifacts.
- The README links and CI badge must resolve to the provided repository URL.

## Delivery

Commit the README and `.gitignore` changes on
`feat/caido-agent-kit-completion`, add
`https://github.com/bicilique/caido-mcp.git` as `origin`, push the branch, and
open a Pull Request targeting `feat/caido-agent-kit`. Preserve the worktree for
review feedback.
