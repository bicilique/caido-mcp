import {
  appendFile,
  chmod,
  lstat,
  mkdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { dirname } from "node:path";

export interface AuditEvent {
  timestamp: string;
  tool: string;
  mode: "read-only" | "active" | "admin";
  phase: "intent" | "final";
  projectId?: string;
  requestIds?: string[];
  targetHost?: string;
  targetPort?: number;
  scopeDecision?: string;
  success: boolean;
  errorCode?: string;
  durationMs: number;
  truncated: boolean;
}

interface AuditLoggerOptions {
  path: string;
  maxBytes: number;
  maxFiles: number;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export class AuditLogger {
  readonly #path: string;
  readonly #maxBytes: number;
  readonly #maxFiles: number;
  #pending: Promise<void> = Promise.resolve();

  constructor(options: AuditLoggerOptions) {
    if (options.maxBytes < 1 || options.maxFiles < 1) {
      throw new Error("Audit bounds must be positive.");
    }
    this.#path = options.path;
    this.#maxBytes = options.maxBytes;
    this.#maxFiles = options.maxFiles;
  }

  record(event: AuditEvent): Promise<void> {
    this.#pending = this.#pending.then(async () => {
      await this.#preparePath();
      await this.#rotateIfNeeded();
      await appendFile(
        this.#path,
        `${JSON.stringify(this.#allowlist(event))}\n`,
        {
          encoding: "utf8",
          mode: 0o600,
        },
      );
      await chmod(this.#path, 0o600);
    });
    return this.#pending;
  }

  async flush(): Promise<void> {
    await this.#pending;
  }

  async close(): Promise<void> {
    await this.flush();
  }

  #allowlist(event: AuditEvent): AuditEvent {
    return {
      timestamp: event.timestamp,
      tool: event.tool,
      mode: event.mode,
      phase: event.phase,
      ...(event.projectId === undefined ? {} : { projectId: event.projectId }),
      ...(event.requestIds === undefined
        ? {}
        : { requestIds: event.requestIds }),
      ...(event.targetHost === undefined
        ? {}
        : { targetHost: event.targetHost }),
      ...(event.targetPort === undefined
        ? {}
        : { targetPort: event.targetPort }),
      ...(event.scopeDecision === undefined
        ? {}
        : { scopeDecision: event.scopeDecision }),
      success: event.success,
      ...(event.errorCode === undefined ? {} : { errorCode: event.errorCode }),
      durationMs: event.durationMs,
      truncated: event.truncated,
    };
  }

  async #preparePath(): Promise<void> {
    const directory = dirname(this.#path);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    try {
      const metadata = await lstat(this.#path);
      if (metadata.isSymbolicLink()) {
        throw new Error("Audit-log path must not be a symlink.");
      }
      if (!metadata.isFile()) {
        throw new Error("Audit-log path must be a regular file.");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async #rotateIfNeeded(): Promise<void> {
    if (!(await pathExists(this.#path))) {
      return;
    }
    if ((await stat(this.#path)).size < this.#maxBytes) {
      return;
    }

    await rm(`${this.#path}.${this.#maxFiles}`, { force: true });
    for (let index = this.#maxFiles - 1; index >= 1; index -= 1) {
      const source = `${this.#path}.${index}`;
      if (await pathExists(source)) {
        await rename(source, `${this.#path}.${index + 1}`);
      }
    }
    await rename(this.#path, `${this.#path}.1`);
  }
}
