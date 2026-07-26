# Architecture

## Context and Components

`AI client → stdio MCP server → shared execution pipeline → CaidoAdapter → official SDK → local Caido`.

The Skill guides operator decisions. `packages/mcp-server` owns transport,
registry, handlers, resources, and prompts. `packages/core` owns configuration,
authentication/cache, the adapter, scope enforcement, redaction, rate limits,
results, and audit logging.

## Data and Authentication Flow

The runtime reads configuration and opens an owner-only cache. The SDK then
uses the configured credential source. Secrets are not tool inputs. SDK
responses are validated and mapped into project-owned types.

## Tool-Call Lifecycle

Schema validation → timeout/cancellation → rate token → durable intent audit
for active tools → selected project → destination normalization and scope check
for Replay/raw send → at most one adapter call → redaction/body bound → final
audit → result envelope.

If intent auditing fails, the active handler is not called and the server
returns non-retryable `AUDIT_UNAVAILABLE`. If final auditing fails after an
active handler completes, mutation evidence is preserved with an explicit
warning so callers do not retry automatically. Read-only audit failures also
return a stable envelope.

## Scope, Redaction, and Errors

Deny rules take precedence over allow rules; ambiguity fails closed. A shared
serializer handles tools and resources. Upstream errors become stable codes
without raw sensitive text.

## Test Architecture

Unit tests cover core behavior. Contract tests cover MCP, stdio, and schemas.
Integration tests use a fake local Caido server through the real adapter.
Real-Caido E2E is opt-in. Skill evaluation is deterministic.
