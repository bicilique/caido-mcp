# Safe Active Testing

Active mode is necessary but insufficient. Confirm explicit authorization, selected project, selected scope, exact destination, one mutation, bounded body/batch, and non-destructive effect. State the action before calling `caido_replay_request`, `caido_send_raw_request`, `caido_select_project`, `caido_create_finding`, `caido_update_finding`, `caido_set_intercept`, or `caido_run_workflow`. Never retry a mutation automatically.
