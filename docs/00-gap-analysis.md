# Gap Analysis

Sources were verified on 2026-07-25. Primary links and details are recorded in
[Current Source Verification](research-current-sources.md).

## Official Capabilities

Caido provides an official TypeScript SDK for authentication, projects, scopes,
requests, findings, workflows, filters, and Replay. Caido 0.57.1 provides a
macOS `x86_64` artifact. Agent Skills provide a portable progressive-instruction
structure.

## Community References

Community MCP servers demonstrate registry and broad-catalog patterns, but
combine destructive and active operations, use unofficial SDKs, or do not meet
this project's scope and mode boundaries.

## Concepts Adopted

The project adopts server-side HTTPQL, bounded results, evidence identifiers, a
canonical registry, MCP annotations, response fingerprints, and a centralized
redaction choke point as concepts. It does not copy community implementations.

## Implemented

The release includes an official-SDK adapter, local stdio transport, 14 read
tools, six bounded active operations, scope-gated Replay/raw send, fail-closed
workflow execution, resources, safe prompts, owner-only caching, centralized
redaction/scope/audit controls, deterministic evaluation, and mock testing.

## Deferred

Deletion, high-volume scanning or fuzzing, race tooling, arbitrary GraphQL or
plugin RPC, scope override, and remote transport remain only in the
[roadmap](roadmap.md).

## Risks

Caido's GraphQL schema is not guaranteed stable, and SDK/instance versions may
be incompatible. One adapter, one tool registry, and generated tool
documentation prevent duplication. AI-client configuration syntax may also
change after the verification date.
