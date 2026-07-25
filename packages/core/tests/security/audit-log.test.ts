import {
  appendFile,
  mkdtemp,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditLogger } from "../../src/security/audit-log.js";
import { removeTestDirectory } from "../support/filesystem.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, appendFile: vi.fn(actual.appendFile) };
});

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "caido-audit-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(removeTestDirectory));
});

describe("AuditLogger", () => {
  it("durably flushes an appended event before record resolves", async () => {
    const directory = await temporaryDirectory();
    const path = join(directory, "audit.jsonl");
    const logger = new AuditLogger({ path, maxBytes: 4096, maxFiles: 2 });
    vi.mocked(appendFile).mockClear();

    await logger.record({
      timestamp: "2026-07-25T04:00:00.000Z",
      tool: "caido_replay_request",
      mode: "active",
      phase: "intent",
      success: true,
      durationMs: 1,
      truncated: false,
    });

    expect(vi.mocked(appendFile)).toHaveBeenCalledWith(
      path,
      expect.stringContaining('"phase":"intent"'),
      expect.objectContaining({
        encoding: "utf8",
        mode: 0o600,
        flush: true,
      }),
    );
    expect(await readFile(path, "utf8")).toContain('"phase":"intent"');
  });

  it("writes allowlisted JSONL fields without secrets", async () => {
    const directory = await temporaryDirectory();
    const path = join(directory, "private", "audit.jsonl");
    const logger = new AuditLogger({ path, maxBytes: 4096, maxFiles: 2 });

    await logger.record({
      timestamp: "2026-07-25T04:00:00.000Z",
      tool: "caido_replay_request",
      mode: "active",
      phase: "final",
      projectId: "project-1",
      requestIds: ["request-1"],
      targetHost: "example.test",
      targetPort: 443,
      scopeDecision: "matched_allow",
      success: true,
      durationMs: 12,
      truncated: false,
      authorization: "Bearer secret",
      body: "secret-body",
    } as never);
    await logger.close();

    const serialized = await readFile(path, "utf8");
    expect(serialized).toBe(
      `${JSON.stringify({
        timestamp: "2026-07-25T04:00:00.000Z",
        tool: "caido_replay_request",
        mode: "active",
        phase: "final",
        projectId: "project-1",
        requestIds: ["request-1"],
        targetHost: "example.test",
        targetPort: 443,
        scopeDecision: "matched_allow",
        success: true,
        durationMs: 12,
        truncated: false,
      })}\n`,
    );
    expect(serialized).not.toContain("secret");
    expect((await stat(join(directory, "private"))).mode & 0o777).toBe(0o700);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it("rotates a bounded log before appending the next event", async () => {
    const directory = await temporaryDirectory();
    const path = join(directory, "audit.jsonl");
    await writeFile(path, `${"x".repeat(200)}\n`, { mode: 0o600 });
    const logger = new AuditLogger({ path, maxBytes: 100, maxFiles: 2 });

    await logger.record({
      timestamp: "2026-07-25T04:00:00.000Z",
      tool: "caido_health",
      mode: "read-only",
      phase: "final",
      success: true,
      durationMs: 1,
      truncated: false,
    });
    await logger.close();

    expect(await readFile(`${path}.1`, "utf8")).toBe(`${"x".repeat(200)}\n`);
    expect(await readFile(path, "utf8")).toContain('"tool":"caido_health"');
  });
});
