import { pathToFileURL } from "node:url";

import { createRuntime, runStdioServer } from "./runtime.js";

export { createRuntime, runStdioServer };

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void runStdioServer().catch((error: unknown) => {
    process.stderr.write(
      `Caido server startup failed: ${
        error instanceof Error ? error.message : "unknown error"
      }\n`,
    );
    process.exitCode = 1;
  });
}
