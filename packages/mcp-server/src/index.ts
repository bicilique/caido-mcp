#!/usr/bin/env node

import { runStdioServer } from "./runtime.js";

export { createRuntime, runStdioServer } from "./runtime.js";

void runStdioServer().catch((error: unknown) => {
  process.stderr.write(
    `Caido server startup failed: ${
      error instanceof Error ? error.message : "unknown error"
    }\n`,
  );
  process.exitCode = 1;
});
