# Threat Model

## Trust Boundaries

The operator and local configuration are trusted only after authorization is
established. The model, captured traffic, comments, file input, Caido
responses, and target-provided text are untrusted.

## Threats and Controls

| Threat                                | Control                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Credential theft or model disclosure  | Private environment/`0600` cache, no secret arguments, recursive redaction, sanitized errors and audits |
| Prompt injection in traffic           | Traffic is labeled untrusted evidence; the Skill forbids following target instructions                  |
| Out-of-scope request                  | URL normalization, selected Caido scope, deny precedence, ambiguity fails closed                        |
| Mutation without durable audit        | Required intent event before active handler; failure returns `AUDIT_UNAVAILABLE`                        |
| Final audit failure after mutation    | Evidence is preserved with a non-retry warning                                                          |
| Workflow with hidden outbound targets | `caido_run_workflow` fails closed with `TOOL_DISABLED`; adapter is not called                           |
| Destructive action                    | No destructive tools; admin adds no capability                                                          |
| Excessive traffic                     | Batch/rate/body/timeout limits and one mutation per call                                                |
| Log leakage                           | Audit JSONL excludes headers, bodies, and secrets; stdout contains MCP only                             |
| File traversal or unsafe symlink      | Cache rejects symlinks/unsafe permissions and uses explicit user paths                                  |
| Malicious file input                  | No arbitrary file tool; inputs are typed and bounded                                                    |
| MCP stdio corruption                  | JSON-RPC only on stdout; diagnostics on stderr; startup contracts                                       |
| Supply-chain compromise               | Frozen lockfile, high-severity audit, secret scan, license inventory, official CI actions               |

## Active Mode and Residual Risk

Active mode must be explicit but does not replace authorization. Audit records
do not prove target safety. Caido SDK/instance compatibility and host integrity
remain residual risks.

## Reporting

Follow the private process in [SECURITY.md](../SECURITY.md). Do not include
credentials or target data.
