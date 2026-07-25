import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const tsx = resolve(root, "node_modules/.bin/tsx");
const secretScanner = resolve(root, "scripts/secret-scan.ts");
const licenseInventory = resolve(root, "scripts/license-inventory.ts");

async function run(
  executable: string,
  args: string[],
  cwd: string,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(executable, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });
  const code = await new Promise<number | null>((resolveExit) => {
    child.once("close", resolveExit);
  });
  return { code, stdout, stderr };
}

async function gitFixture(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "caido release scripts "));
  await run("git", ["init", "-q"], directory);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(resolve(directory, path, ".."), { recursive: true });
    await writeFile(resolve(directory, path), content, "utf8");
  }
  return directory;
}

async function packageFixture(
  store: string,
  entry: string,
  packagePath: string,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const directory = join(store, entry, "node_modules", packagePath);
  await mkdir(directory, { recursive: true });
  const manifest = join(directory, "package.json");
  if (metadata !== undefined) {
    await writeFile(manifest, JSON.stringify(metadata), "utf8");
  }
  return manifest;
}

describe("secret scanner", () => {
  it("detects HTTP and token-cache credentials without echoing values", async () => {
    const bearer = ["m7q2v9x4c8k3p6w5", "t1n0r7b4"].join("");
    const apiKey = ["f4a9d2s8k6j1h7g5", "q3w0e9r2"].join("");
    const access = ["z8x2c7v4b9n1m6a5", "s3d0f8j4"].join("");
    const refresh = ["p6o2i9u4y7t1r8e5", "w3q0a6s2"].join("");
    const fixture = await gitFixture({
      "request.txt": `Authori${"zation"}: Bea${"rer"} ${bearer}\napi_${"key"}=${apiKey}\n`,
      "cache.json": JSON.stringify({
        [`access${"Token"}`]: access,
        [`refresh${"Token"}`]: refresh,
      }),
    });

    const result = await run(tsx, [secretScanner, "--root", fixture], fixture);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/authorization bearer/i);
    expect(result.stderr).toMatch(/api key/i);
    expect(result.stderr).toMatch(/token cache credential/i);
    for (const secret of [bearer, apiKey, access, refresh]) {
      expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
    }
  });

  it("accepts placeholders and ordinary source text", async () => {
    const fixture = await gitFixture({
      "README.md":
        "CAIDO_PAT='<operator-supplied>'\nAuthorization is always redacted.\n",
      "config.ts": 'const field = ["api", "key"].join("_");\n',
    });

    const result = await run(tsx, [secretScanner, "--root", fixture], fixture);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
  });
});

describe("license inventory", () => {
  it("emits deterministic sorted entries and a summary", async () => {
    const store = await mkdtemp(join(tmpdir(), "caido license store "));
    await packageFixture(store, "zeta@1.0.0", "zeta", {
      name: "zeta",
      version: "1.0.0",
      license: "MIT",
    });
    await packageFixture(store, "@scope+alpha@2.0.0", "@scope/alpha", {
      name: "@scope/alpha",
      version: "2.0.0",
      license: "Apache-2.0",
    });

    const result = await run(tsx, [licenseInventory, "--store", store], root);
    const inventory = JSON.parse(result.stdout) as {
      packages: Array<{ id: string; license: string }>;
      summary: Record<string, number>;
    };

    expect(result.code).toBe(0);
    expect(inventory.packages).toEqual([
      { id: "@scope/alpha@2.0.0", license: "Apache-2.0" },
      { id: "zeta@1.0.0", license: "MIT" },
    ]);
    expect(inventory.summary).toEqual({ "Apache-2.0": 1, MIT: 1 });
  });

  it("fails for missing and unreadable manifests", async () => {
    const missingStore = await mkdtemp(
      join(tmpdir(), "caido missing license store "),
    );
    await packageFixture(missingStore, "missing@1.0.0", "missing");
    const missing = await run(
      tsx,
      [licenseInventory, "--store", missingStore],
      root,
    );
    expect(missing.code).not.toBe(0);
    expect(missing.stderr).toMatch(/missing package manifest/i);

    const unreadableStore = await mkdtemp(
      join(tmpdir(), "caido unreadable license store "),
    );
    const manifest = await packageFixture(
      unreadableStore,
      "unreadable@1.0.0",
      "unreadable",
      { name: "unreadable", version: "1.0.0", license: "MIT" },
    );
    await chmod(manifest, 0o000);
    const unreadable = await run(
      tsx,
      [licenseInventory, "--store", unreadableStore],
      root,
    );
    await chmod(manifest, 0o600);
    expect(unreadable.code).not.toBe(0);
    expect(unreadable.stderr).toMatch(/cannot read package manifest/i);

    const unreadableDirectoryStore = await mkdtemp(
      join(tmpdir(), "caido unreadable license directory "),
    );
    await packageFixture(
      unreadableDirectoryStore,
      "directory@1.0.0",
      "directory",
      { name: "directory", version: "1.0.0", license: "MIT" },
    );
    const modules = join(
      unreadableDirectoryStore,
      "directory@1.0.0",
      "node_modules",
    );
    await chmod(modules, 0o000);
    const unreadableDirectory = await run(
      tsx,
      [licenseInventory, "--store", unreadableDirectoryStore],
      root,
    );
    await chmod(modules, 0o700);
    expect(unreadableDirectory.code).not.toBe(0);
    expect(unreadableDirectory.stderr).toMatch(
      /cannot read package directory/i,
    );
  }, 15_000);

  it.each(["store-entry", "package"] as const)(
    "rejects an unreadable %s directory without leaking manifests",
    async (blockedLevel) => {
      const store = await mkdtemp(
        join(tmpdir(), `caido blocked license ${blockedLevel} `),
      );
      const marker = `private-${blockedLevel}-license-value`;
      const storeEntry = join(store, "blocked@1.0.0");
      const packageDirectory = join(storeEntry, "node_modules", "blocked");
      await packageFixture(store, "blocked@1.0.0", "blocked", {
        name: marker,
        version: "1.0.0",
        license: "MIT",
      });
      const blockedPath =
        blockedLevel === "store-entry" ? storeEntry : packageDirectory;
      await chmod(blockedPath, 0o000);
      const result = await run(tsx, [licenseInventory, "--store", store], root);
      await chmod(blockedPath, 0o700);

      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/cannot read package directory/i);
      expect(`${result.stdout}${result.stderr}`).not.toContain(marker);
    },
    15_000,
  );
});
