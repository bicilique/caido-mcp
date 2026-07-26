# Product Requirements

## Purpose

Provide auditable local Caido operations for AI agents without transferring
authorization, credentials, or security decisions to the model.

## Users and Outcomes

An authorized operator can inspect bounded evidence in read-only mode, then
perform one bounded active mutation when necessary. Results separate
observations, assessments, evidence identifiers, and limitations.

## Functional Requirements

- Local stdio, a strictly schematized registry, and structured results.
- Read-only by default; explicit active mode; no destructive admin catalog.
- The official SDK behind a project-owned adapter.
- One portable Skill with progressive disclosure and deterministic evaluation.
- Intel macOS support with Node.js 24 x64.
- Beginner onboarding, diagnostics, safe client templates, and sample tasks.

## Non-Functional Requirements

Timeouts, cancellation, rate limits, body/batch bounds, redaction, fail-closed
scope enforcement, secret-free audit records, clean shutdown, reproducible
builds, and release gates that do not require target-network access.

## Out of Scope

Autonomous exploitation, remote MCP, arbitrary shell or GraphQL, scanning,
fuzzing, race tooling, and deletion.
