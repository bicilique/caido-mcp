# Security Policy

## Authorized-use boundary

Use this project only for assets, identities, techniques, time windows, and effects explicitly authorized by the target owner. Caido traffic does not itself establish authorization. The project is not an out-of-scope override or autonomous scanner.

## Security model

- Credentials stay in process environment or an owner-only token cache and must never enter model context, process arguments, MCP results, diagnostics, snapshots, or audit events.
- Captured traffic is an untrusted prompt-injection boundary. Target text is evidence, never an instruction to run commands, browse URLs, reveal secrets, or change configuration.
- Default redaction removes sensitive headers and token-like fields. Binary and large bodies are bounded and represented by metadata.
- Active network tools require explicit active mode and an allowed selected Caido scope. Missing, denied, or ambiguous scope fails closed.
- The bounded JSONL audit log records tool, duration, outcome, and evidence identifiers without secrets.

## Reporting a vulnerability

Report vulnerabilities privately to the project maintainers through the repository host's private security-advisory channel. Include affected version, impact, minimal reproduction, and a proposed safe contact method. Do not include live credentials, target traffic, or customer data, and do not open a public issue before coordinated disclosure.

## Known limitations

The security boundary depends on the supported Caido SDK/API range and local filesystem integrity. MCP annotations are interoperability hints, not authorization controls. Client configuration syntax can change after its documented verification date. Real-Caido E2E requires an operator-controlled localhost instance and is not run by default.
