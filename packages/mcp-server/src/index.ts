import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createRuntime, runStdioServer } from "./runtime.js";

export { createRuntime, runStdioServer };

function canonicalPath(path: string): string | undefined {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}

function canonicalModulePath(url: string): string | undefined {
  try {
    return canonicalPath(fileURLToPath(url));
  } catch {
    return undefined;
  }
}

const executedPath =
  process.argv[1] === undefined ? undefined : canonicalPath(process.argv[1]);
const modulePath = canonicalModulePath(import.meta.url);

if (
  executedPath !== undefined &&
  modulePath !== undefined &&
  executedPath === modulePath
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
