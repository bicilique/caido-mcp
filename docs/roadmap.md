# Roadmap

The following capabilities are deliberately deferred and are not registered or
available as MCP tools in the first release:

- deleting projects;
- deleting scopes;
- deleting findings;
- dropping intercepted requests;
- high-volume fuzzing;
- active scanning;
- race-condition attack tooling;
- out-of-scope overrides;
- arbitrary plugin RPC;
- arbitrary GraphQL;
- remote internet-exposed MCP transport.

Each item has a large blast radius, needs additional authorization policy, uses
an unstable API, or risks bypassing Caido audit boundaries. A candidate
requires a new threat model, a narrow schema and adapter, scope/mode gates, a
failing test, audit events, documentation, and design approval. There are no
placeholder tools for deferred capabilities.
