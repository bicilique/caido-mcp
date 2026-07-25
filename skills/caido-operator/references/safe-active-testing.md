# Safe Active Testing

Active mode is necessary but insufficient. Confirm explicit authorization,
selected project, and one bounded, non-destructive mutation. For
`caido_replay_request` and `caido_send_raw_request`, also confirm the selected
scope and exact destination. State the action before calling any available
active operation. `caido_run_workflow` is unavailable because all outbound
targets cannot be inspected; do not call it. Never retry a mutation
automatically. If audit finalization fails after execution, preserve the
returned evidence and warning and do not retry.
