import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SecureTokenCache } from "../../src/caido/token-cache.js";
import { removeTestDirectory } from "../support/filesystem.js";

const directories: string[] = [];

async function cachePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "caido-cache-"));
  directories.push(directory);
  return join(directory, "private", "tokens.json");
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(removeTestDirectory));
});

describe("SecureTokenCache", () => {
  it("round-trips tokens through owner-only storage", async () => {
    const path = await cachePath();
    const cache = new SecureTokenCache(path);
    const token = {
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };

    await cache.save(token);

    expect(await cache.load()).toEqual(token);
    expect((await lstat(join(path, ".."))).mode & 0o777).toBe(0o700);
    expect((await lstat(path)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(token);
  });

  it("removes and ignores an expired token", async () => {
    const path = await cachePath();
    const cache = new SecureTokenCache(path);
    await cache.save({
      accessToken: "expired",
      expiresAt: "2000-01-01T00:00:00.000Z",
    });

    expect(await cache.load()).toBeUndefined();
    await expect(lstat(path)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects malformed cache data without echoing file content", async () => {
    const path = await cachePath();
    const cache = new SecureTokenCache(path);
    await cache.save({ accessToken: "initial" });
    await writeFile(path, '{"accessToken":"secret"', { mode: 0o600 });

    await expect(cache.load()).rejects.toThrow(/malformed token cache/i);
    await expect(cache.load()).rejects.not.toThrow(/secret/);
  });

  it("rejects a world-readable existing cache", async () => {
    const path = await cachePath();
    const cache = new SecureTokenCache(path);
    await cache.save({ accessToken: "secret" });
    await chmod(path, 0o644);

    await expect(cache.load()).rejects.toThrow(/permissions/i);
  });

  it("rejects a symlinked cache path", async () => {
    const path = await cachePath();
    const target = join(path, "..", "target.json");
    await mkdir(join(path, ".."), { recursive: true, mode: 0o700 });
    await writeFile(target, '{"accessToken":"secret"}', { mode: 0o600 });
    await symlink(target, path);

    await expect(new SecureTokenCache(path).load()).rejects.toThrow(/symlink/i);
  });
});
