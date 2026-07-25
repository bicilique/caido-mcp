# Troubleshooting

Start with `caido_health`. For `CAIDO_UNREACHABLE`, verify the configured URL and local listener. For `AUTH_REQUIRED` or `AUTH_FAILED`, verify credential configuration or remove the documented cache and authenticate again without printing tokens. For `INVALID_HTTPQL`, simplify using the HTTPQL reference. For stdio corruption, separate stdout/stderr and remove ordinary stdout logging. Never weaken redaction or scope enforcement to diagnose a failure.
