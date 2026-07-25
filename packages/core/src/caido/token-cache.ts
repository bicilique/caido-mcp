import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import { dirname, join } from "node:path";

import type { CachedToken, TokenCache } from "@caido/sdk-client";
import { z } from "zod";

const CachedTokenSchema = z.strictObject({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.iso.datetime().optional(),
});

async function existingFile(
  path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export class SecureTokenCache implements TokenCache {
  readonly #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  async load(): Promise<CachedToken | undefined> {
    const metadata = await this.#assertSafeExistingFile();
    if (metadata === undefined) {
      return undefined;
    }

    let value: unknown;
    try {
      value = JSON.parse(await readFile(this.#path, "utf8"));
    } catch {
      throw new Error("Malformed token cache.");
    }
    const parsed = CachedTokenSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error("Malformed token cache.");
    }
    if (
      parsed.data.expiresAt !== undefined &&
      Date.parse(parsed.data.expiresAt) <= Date.now()
    ) {
      await this.clear();
      return undefined;
    }
    return {
      accessToken: parsed.data.accessToken,
      ...(parsed.data.refreshToken === undefined
        ? {}
        : { refreshToken: parsed.data.refreshToken }),
      ...(parsed.data.expiresAt === undefined
        ? {}
        : { expiresAt: parsed.data.expiresAt }),
    };
  }

  async save(token: CachedToken): Promise<void> {
    const parsed = CachedTokenSchema.safeParse(token);
    if (!parsed.success) {
      throw new Error("Refusing to store a malformed token.");
    }

    const directory = dirname(this.#path);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    await this.#assertSafeExistingFile();

    const temporaryPath = join(
      directory,
      `.tokens-${process.pid}-${crypto.randomUUID()}.tmp`,
    );
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(parsed.data), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, this.#path);
    await chmod(this.#path, 0o600);
  }

  async clear(): Promise<void> {
    const metadata = await this.#assertSafeExistingFile();
    if (metadata !== undefined) {
      await unlink(this.#path);
    }
  }

  async #assertSafeExistingFile(): Promise<
    Awaited<ReturnType<typeof lstat>> | undefined
  > {
    const metadata = await existingFile(this.#path);
    if (metadata === undefined) {
      return undefined;
    }
    if (metadata.isSymbolicLink()) {
      throw new Error("Token cache path must not be a symlink.");
    }
    if (!metadata.isFile()) {
      throw new Error("Token cache path must be a regular file.");
    }
    if ((Number(metadata.mode) & 0o077) !== 0) {
      throw new Error("Token cache permissions must be owner-only.");
    }
    return metadata;
  }
}
