# Changelog

All notable changes are documented here. The format follows Keep a Changelog; the project has not yet published a stable release.

## [Unreleased]

### Added

- Security-first Agent Skill and local stdio MCP server.
- Read-only tools, scope-gated active tools, resources, prompts, deterministic Skill evaluation, mock-backed integration tests, and opt-in real-Caido E2E.
- Intel macOS verification, client configuration, release automation, secret scanning, and dependency-license inventory.

### Fixed

- The documented absolute `packages/mcp-server/dist/index.js` path now starts the stdio server when executed directly, including through canonicalized symlinks with spaces, while remaining side-effect-free when imported as a library.

### Security

- Central timeout, cancellation, rate-limit, redaction, safe-error, and secret-free audit pipeline.
- Release verification on 2026-07-25 passed all deterministic gates, the pinned official MCP Inspector 0.21.2 checks, and the local macOS Intel verifier. Real-Caido E2E remains intentionally opt-in; one moderate transitive Windows-only static-file advisory is documented in the release checklist.
