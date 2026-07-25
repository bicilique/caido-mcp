# Replay

Identify the original request ID and a single intended mutation. Preserve unrelated request structure, redact credentials in reporting, and define a control response before sending. Verify active mode and scope, call `caido_replay_request` once, then compare IDs, status, headers, lengths, fingerprints, semantic content, and observable side effects. Do not infer authorization bypass from status alone.
