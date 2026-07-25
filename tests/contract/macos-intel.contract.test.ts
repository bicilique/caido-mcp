import { spawn } from "node:child_process";
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const script = resolve(root, "scripts/verify-macos-intel.sh");
const dependencyVerifier = resolve(
  root,
  "scripts/verify-installed-packages.mjs",
);
const mcpVerifier = resolve(
  root,
  "skills/caido-operator/scripts/verify-mcp.mjs",
);

async function executable(path: string, source: string): Promise<void> {
  await writeFile(path, source, "utf8");
  await chmod(path, 0o755);
}

async function runProcess(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
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

async function runVerification(
  architecture: "arm64" | "x86_64",
  nodeArchitecture: "arm64" | "x64",
  options: { root?: string; store?: string; sentinel?: string } = {},
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const directory = await mkdtemp(join(tmpdir(), "caido intel contract "));
  const realNode = process.execPath;
  await executable(
    join(directory, "uname"),
    `#!/bin/sh\nprintf '%s\\n' '${architecture}'\n`,
  );
  await executable(
    join(directory, "node"),
    `#!/bin/sh
if [ "$1" = "-p" ] && [ "$2" = "process.arch" ]; then
  printf '%s\\n' '${nodeArchitecture}'
  exit 0
fi
exec '${realNode}' "$@"
`,
  );
  await executable(
    join(directory, "sw_vers"),
    "#!/bin/sh\nprintf '%s\\n' 'ProductName: macOS'\n",
  );
  if (process.platform !== "darwin") {
    await executable(
      join(directory, "stat"),
      `#!/bin/sh
if [ "$1" = "-f" ] && [ "$2" = "%Lp" ]; then
  exec /usr/bin/stat -c '%a' "$3"
fi
exec /usr/bin/stat "$@"
`,
    );
  }

  return runProcess("bash", [script], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${directory}${delimiter}${process.env.PATH ?? ""}`,
      ...(options.root === undefined
        ? {}
        : { CAIDO_VERIFY_ROOT: options.root }),
      ...(options.store === undefined
        ? {}
        : { CAIDO_VERIFY_PNPM_STORE: options.store }),
      ...(options.sentinel === undefined
        ? {}
        : { CAIDO_VERIFY_SENTINEL: options.sentinel }),
    },
  });
}

async function packageFixture(
  store: string,
  storeEntry: string,
  packagePath: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const directory = join(store, storeEntry, "node_modules", packagePath);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify(metadata),
    "utf8",
  );
}

async function macosIntelStore(): Promise<string> {
  const store = await mkdtemp(join(tmpdir(), "caido darwin x64 store "));
  await packageFixture(store, "portable@1.0.0", "portable", {
    name: "portable",
    version: "1.0.0",
    os: ["darwin"],
    cpu: ["x64"],
  });
  return store;
}

describe("macOS Intel verifier", () => {
  it("rejects Apple Silicon without claiming Intel validation", async () => {
    const result = await runVerification("arm64", "x64");

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/arm64[^]*x86_64/is);
    expect(result.stdout).not.toMatch(/verified|terverifikasi/i);
  });

  it("rejects an arm64 Node process on an Intel host", async () => {
    const result = await runVerification("x86_64", "arm64");

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/Node[^]*arm64[^]*x64/is);
    expect(result.stdout).not.toMatch(/verified|terverifikasi/i);
  });

  it("verifies package count, stdio purity, credentials, permissions, and spaced paths", async () => {
    const sentinel = ["pat", "must", "not", "leak"].join("-");
    const store = await macosIntelStore();
    const result = await runVerification("x86_64", "x64", {
      sentinel,
      store,
    });

    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/macOS Intel verification passed/i);
    expect(result.stdout).toMatch(/absolute path containing spaces/i);
    expect(result.stdout).toMatch(/stdout contains JSON-RPC frames only/i);
    expect(result.stdout).toMatch(/installed package manifests: [1-9]\d*/i);
    expect(result.stdout).toMatch(/credential paths and permissions/i);
    expect(`${result.stdout}${result.stderr}`).not.toContain(sentinel);
  }, 15_000);

  it("builds a fresh isolated checkout before Intel verification", async () => {
    const isolated = await mkdtemp(
      join(tmpdir(), "caido fresh checkout with spaces "),
    );
    await mkdir(join(isolated, "packages"), { recursive: true });
    await mkdir(join(isolated, "scripts"), { recursive: true });
    await mkdir(join(isolated, "skills/caido-operator/scripts"), {
      recursive: true,
    });
    for (const path of [
      "package.json",
      "pnpm-workspace.yaml",
      "tsconfig.json",
      "tsconfig.base.json",
    ]) {
      await cp(resolve(root, path), join(isolated, path));
    }
    for (const packageName of ["core", "mcp-server"]) {
      await cp(
        resolve(root, "packages", packageName),
        join(isolated, "packages", packageName),
        {
          recursive: true,
          filter: (source) => !source.split("/").includes("dist"),
        },
      );
    }
    for (const path of [
      "verify-installed-packages.mjs",
      "verify-macos-intel.sh",
    ]) {
      await cp(resolve(root, "scripts", path), join(isolated, "scripts", path));
    }
    for (const path of ["verify-mcp.mjs", "verify-skill.mjs", "doctor.sh"]) {
      await cp(
        resolve(root, "skills/caido-operator/scripts", path),
        join(isolated, "skills/caido-operator/scripts", path),
      );
      await chmod(join(isolated, "skills/caido-operator/scripts", path), 0o755);
    }
    await symlink(
      resolve(root, "node_modules"),
      join(isolated, "node_modules"),
    );

    await expect(
      stat(join(isolated, "packages/mcp-server/dist/cli.js")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const build = await runProcess("corepack", ["pnpm", "build"], {
      cwd: isolated,
    });
    expect(build.code, build.stderr).toBe(0);
    await expect(
      stat(join(isolated, "packages/mcp-server/dist/cli.js")),
    ).resolves.toBeDefined();

    const store = await macosIntelStore();
    const result = await runVerification("x86_64", "x64", {
      root: isolated,
      store,
    });
    expect(result.code, result.stderr).toBe(0);
  }, 30_000);
});

describe("installed package verifier", () => {
  it("fails when no package manifest was scanned", async () => {
    const store = await mkdtemp(join(tmpdir(), "caido empty pnpm store "));
    const result = await runProcess(process.execPath, [
      dependencyVerifier,
      store,
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/zero package manifests/i);
  });

  it("accepts x64-capable scoped and unscoped packages", async () => {
    const store = await mkdtemp(join(tmpdir(), "caido x64 pnpm store "));
    await packageFixture(store, "plain@1.0.0", "plain", {
      name: "plain",
      version: "1.0.0",
      cpu: ["x64", "arm64"],
      os: ["darwin"],
    });
    await packageFixture(store, "@scope+pkg@2.0.0", "@scope/pkg", {
      name: "@scope/pkg",
      version: "2.0.0",
      binary: { package_name: "pkg-darwin-x64" },
    });
    const result = await runProcess(process.execPath, [
      dependencyVerifier,
      store,
    ]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/2 installed package manifests/i);
  });

  it("rejects arm64-only metadata without echoing manifest secrets", async () => {
    const store = await mkdtemp(join(tmpdir(), "caido arm64 pnpm store "));
    const sentinel = ["manifest", "secret", "must", "not", "leak"].join("-");
    await packageFixture(store, "unsafe@1.0.0", "unsafe", {
      name: "unsafe",
      version: "1.0.0",
      cpu: ["arm64"],
      binary: { target: "darwin-arm64", credential: sentinel },
    });
    const result = await runProcess(process.execPath, [
      dependencyVerifier,
      store,
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/arm64-only/i);
    expect(`${result.stdout}${result.stderr}`).not.toContain(sentinel);
  });

  it("does not let unrelated linux x64 metadata compensate darwin arm64", async () => {
    const store = await mkdtemp(join(tmpdir(), "caido target pnpm store "));
    await packageFixture(store, "mixed@1.0.0", "mixed", {
      name: "mixed",
      version: "1.0.0",
      binary: {
        targets: ["linux-x64", "darwin-arm64"],
      },
    });
    const result = await runProcess(process.execPath, [
      dependencyVerifier,
      store,
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/darwin[^]*arm64-only/i);
  });

  it("accepts an explicit universal darwin artifact", async () => {
    const store = await mkdtemp(join(tmpdir(), "caido universal store "));
    await packageFixture(store, "universal@1.0.0", "universal", {
      name: "universal",
      version: "1.0.0",
      binary: { target: "darwin-universal" },
    });
    const result = await runProcess(process.execPath, [
      dependencyVerifier,
      store,
    ]);

    expect(result.code).toBe(0);
  });

  it("fails unreadable directories and malformed manifests even for their owner", async () => {
    const unreadableStore = await mkdtemp(
      join(tmpdir(), "caido unreadable package store "),
    );
    await packageFixture(unreadableStore, "blocked@1.0.0", "blocked", {
      name: "blocked",
      version: "1.0.0",
    });
    const modules = join(unreadableStore, "blocked@1.0.0", "node_modules");
    await chmod(modules, 0o000);
    const unreadable = await runProcess(process.execPath, [
      dependencyVerifier,
      unreadableStore,
    ]);
    await chmod(modules, 0o700);
    expect(unreadable.code).not.toBe(0);
    expect(unreadable.stderr).toMatch(/unreadable package directory/i);

    const malformedStore = await mkdtemp(
      join(tmpdir(), "caido malformed package store "),
    );
    const directory = join(
      malformedStore,
      "malformed@1.0.0",
      "node_modules",
      "malformed",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "package.json"), "{broken", "utf8");
    const malformed = await runProcess(process.execPath, [
      dependencyVerifier,
      malformedStore,
    ]);
    expect(malformed.code).not.toBe(0);
    expect(malformed.stderr).toMatch(/malformed package manifest/i);
  });

  it.each(["store-entry", "package"] as const)(
    "rejects an unreadable %s directory without leaking manifests",
    async (blockedLevel) => {
      const store = await mkdtemp(
        join(tmpdir(), `caido blocked ${blockedLevel} store `),
      );
      const marker = `private-${blockedLevel}-manifest-value`;
      const storeEntry = join(store, "blocked@1.0.0");
      const packageDirectory = join(storeEntry, "node_modules", "blocked");
      await packageFixture(store, "blocked@1.0.0", "blocked", {
        name: marker,
        version: "1.0.0",
      });
      const blockedPath =
        blockedLevel === "store-entry" ? storeEntry : packageDirectory;
      await chmod(blockedPath, 0o000);
      const result = await runProcess(process.execPath, [
        dependencyVerifier,
        store,
      ]);
      await chmod(blockedPath, 0o700);

      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/unreadable package directory/i);
      expect(`${result.stdout}${result.stderr}`).not.toContain(marker);
    },
  );
});

describe("MCP stdio verifier", () => {
  it("rejects diagnostic JSON and terminates the child before a hard deadline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido fake mcp "));
    const fakeServer = join(directory, "fake server with spaces.mjs");
    await writeFile(
      fakeServer,
      `process.stdin.once("data", () => {
  const frames = [
    { jsonrpc: "2.0", id: 1, result: { serverInfo: { name: "fake" } } },
    { jsonrpc: "2.0", id: 2, result: { tools: [] } },
    { jsonrpc: "2.0", id: 3, result: { resources: [] } },
    { jsonrpc: "2.0", id: 4, result: { prompts: [] } },
    { jsonrpc: "2.0", id: 5, result: { content: [], structuredContent: {} } },
    { level: "info", message: "diagnostic" }
  ];
  process.stdout.write(frames.map(JSON.stringify).join("\\n") + "\\n");
});
setInterval(() => {}, 1000);
`,
      "utf8",
    );
    const startedAt = Date.now();
    const result = await runProcess(process.execPath, [
      mcpVerifier,
      fakeServer,
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/diagnostic JSON|non-JSON-RPC/i);
    expect(Date.now() - startedAt).toBeLessThan(4_000);
  }, 5_000);

  it("parses responses split across chunks including a final fragment", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido split mcp "));
    const fakeRoot = join(directory, "packages");
    const fakeDist = join(fakeRoot, "mcp-server", "dist");
    await mkdir(fakeDist, { recursive: true });
    await symlink(
      resolve(root, "packages/core/dist"),
      join(fakeRoot, "core", "dist"),
      "dir",
    ).catch(async () => {
      await mkdir(join(fakeRoot, "core"), { recursive: true });
      await symlink(
        resolve(root, "packages/core/dist"),
        join(fakeRoot, "core", "dist"),
        "dir",
      );
    });
    const fakeServer = join(fakeDist, "split server.mjs");
    await writeFile(
      fakeServer,
      `import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const audit = process.env.CAIDO_AUDIT_LOG;
mkdirSync(dirname(audit), { recursive: true, mode: 0o700 });
chmodSync(dirname(audit), 0o700);
writeFileSync(audit, "{\\"safe\\":true}\\n", { mode: 0o600 });
process.stdin.once("data", async () => {
  const frames = [
    { jsonrpc: "2.0", id: 1, result: { serverInfo: { name: "fake" } } },
    { jsonrpc: "2.0", id: 2, result: { tools: [] } },
    { jsonrpc: "2.0", id: 3, result: { resources: [] } },
    { jsonrpc: "2.0", id: 4, result: { prompts: [] } },
    { jsonrpc: "2.0", id: 5, result: { content: [], structuredContent: {} } }
  ];
  const payload = frames.map(JSON.stringify).join("\\n");
  for (let index = 0; index < payload.length; index += 7) {
    process.stdout.write(payload.slice(index, index + 7));
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  process.exit(0);
});
`,
      "utf8",
    );
    const result = await runProcess(process.execPath, [
      mcpVerifier,
      fakeServer,
    ]);

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/MCP stdio verified/i);
  });

  it("detects a sentinel written to the monitored token cache without printing it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido sentinel mcp "));
    const fakeServer = join(directory, "sentinel server.mjs");
    const sentinel = ["lower", "case", "sentinel", "m7q2v9x4c8"].join("-");
    await writeFile(
      fakeServer,
      `import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
for (const path of [process.env.CAIDO_AUDIT_LOG, process.env.CAIDO_TOKEN_CACHE]) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  chmodSync(dirname(path), 0o700);
}
writeFileSync(process.env.CAIDO_AUDIT_LOG, "safe\\n", { mode: 0o600 });
writeFileSync(process.env.CAIDO_TOKEN_CACHE, process.env.CAIDO_PAT, { mode: 0o600 });
process.stdin.once("data", () => {
  const frames = [
    { jsonrpc: "2.0", id: 1, result: { serverInfo: { name: "fake" } } },
    { jsonrpc: "2.0", id: 2, result: { tools: [] } },
    { jsonrpc: "2.0", id: 3, result: { resources: [] } },
    { jsonrpc: "2.0", id: 4, result: { prompts: [] } },
    { jsonrpc: "2.0", id: 5, result: { content: [], structuredContent: {} } }
  ];
  process.stdout.write(frames.map(JSON.stringify).join("\\n") + "\\n");
});
setInterval(() => {}, 1000);
`,
      "utf8",
    );
    const cache = join(directory, "monitored cache/token.json");
    const audit = join(directory, "monitored audit/audit.jsonl");
    const result = await runProcess(
      process.execPath,
      [mcpVerifier, fakeServer],
      {
        env: {
          ...process.env,
          CAIDO_TOKEN_CACHE: cache,
          CAIDO_AUDIT_LOG: audit,
          CAIDO_VERIFY_SENTINEL: sentinel,
        },
      },
    );

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/monitored token cache/i);
    expect(`${result.stdout}${result.stderr}`).not.toContain(sentinel);
  });

  it("rejects a malformed complete stdout line", async () => {
    const directory = await mkdtemp(join(tmpdir(), "caido malformed mcp "));
    const fakeServer = join(directory, "malformed server.mjs");
    await writeFile(
      fakeServer,
      `process.stdin.once("data", () => process.stdout.write("{broken}\\n"));
setInterval(() => {}, 1000);
`,
      "utf8",
    );
    const result = await runProcess(process.execPath, [
      mcpVerifier,
      fakeServer,
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/non-JSON line/i);
  });
});
