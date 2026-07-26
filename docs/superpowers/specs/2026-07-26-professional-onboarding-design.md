# Professional Onboarding Design

**Date:** 2026-07-26  
**Status:** Approved by delegated product decision

## Goal

Make Caido Agent Kit approachable for a low-skill user without weakening its
security posture or hiding operational requirements. A new user should be able
to understand the product, install it, verify the installation, connect a
supported AI client, and complete a first read-only task by following one
linear English-language path.

## Audience

The primary audience includes both:

- security beginners who are learning Caido; and
- experienced Caido users who are new to MCP and AI-client configuration.

The default documentation path explains terminology and commands. Advanced
architecture, threat-model, and tool-catalog material remains available as
reference documentation.

## Chosen Approach

Add a guided onboarding layer around the existing implementation. Preserve the
current TypeScript monorepo, MCP server, operator skill, registry, and security
controls. Do not introduce a second runtime, a graphical installer, or silent
changes to user-level client configuration.

The onboarding path is:

1. Understand what the project does and does not do.
2. Check prerequisites.
3. Install dependencies and build.
4. Run a local doctor command.
5. generate or copy a client configuration safely.
6. Start with a sample read-only prompt.
7. Learn how and when active mode may be enabled.
8. Use troubleshooting and reference documentation when needed.

## Deliverables

### English-First Documentation

- Rewrite the root README as a beginner-friendly landing page.
- Add a complete English usage guide with explanations, commands, sample
  prompts, expected behavior, and recovery paths.
- Retain the Indonesian guide as a clearly labeled translation.
- Convert core reference documents that are linked from the English path to
  English where necessary.
- Add contributing and conduct guidance expected in a public project.

### Guided Commands

- Expose conventional `make` commands for setup, build, test, lint, doctor, and
  verification.
- Add a cross-platform Node-based doctor command that checks supported runtime,
  package manager, build output, configuration values, and local Caido
  reachability without displaying credentials.
- Add a configuration helper that prints client-specific configuration using
  absolute paths. It must never embed a credential and must not modify user
  files automatically.

### Examples

- Provide a minimal `.env.example`.
- Provide client configuration examples for Codex, Claude Code, and Cursor.
- Provide sample natural-language tasks for health checks, request history,
  request inspection, response comparison, and safe troubleshooting.
- Show expected response structure without claiming live findings.

### Quality Controls

- Unit or contract tests cover onboarding command behavior.
- Documentation tests verify important links, commands, and English onboarding
  content.
- Existing formatting, lint, type-check, test, coverage, security, generated
  file, and build checks remain green.

## Component Design

### `scripts/doctor.ts`

Collects diagnostics through small testable functions. It reports a pass,
warning, or failure for each check and ends with specific remediation steps.
Credential variables are reported only as present or absent. Local connection
checks use a short timeout and do not send target traffic.

### `scripts/print-client-config.ts`

Accepts one supported client name and prints a ready-to-copy configuration.
Paths are resolved from the repository root and serialized correctly even when
they contain spaces. The output references credential environment variables
instead of their values. Unsupported client names return a helpful error and a
non-zero exit code.

### Documentation Structure

The README provides the shortest successful path. `docs/getting-started.md`
contains the full tutorial. `docs/examples.md` contains reusable prompts and
expected response shapes. Existing deep technical documents remain linked
under an advanced section.

## Safety and Error Handling

- Read-only remains the default.
- Setup helpers do not write outside the repository.
- No helper reads or prints credential values.
- Reachability checks are limited to the configured local Caido base URL.
- Invalid URLs, unsupported clients, missing build output, and incompatible
  runtimes produce actionable messages.
- Active-mode examples explain authorization and scope requirements and never
  encourage auto-approval.

## Testing

- Test pure diagnostic and configuration-formatting functions with injected
  environment, filesystem, and network dependencies.
- Test CLI exit codes and output for successful and failing cases.
- Extend documentation contracts to require the quick-start path, sample
  prompts, safety warning, and valid local links.
- Run the complete repository verification pipeline before completion.

## Success Criteria

- A beginner can follow one English guide without consulting source code.
- All setup commands are copy-pasteable from the repository root.
- `pnpm doctor` explains what is missing and how to fix it.
- `pnpm config:client <client>` produces a safe configuration template.
- At least five realistic sample tasks are documented.
- Credentials never appear in generated output.
- Existing security posture and verification checks remain intact.

## Non-Goals

- Installing Caido itself.
- Storing or provisioning PATs.
- Automatically editing Codex, Claude Code, or Cursor configuration.
- Adding remote MCP transport, scanning, fuzzing, or destructive capabilities.
- Replacing the existing operator skill or server architecture.
