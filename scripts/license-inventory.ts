import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type PackageMetadata = {
  name?: string;
  version?: string;
  license?: string | { type?: string };
  licenses?: Array<{ type?: string }>;
};

async function packageManifestPaths(modules: string): Promise<string[]> {
  const paths: string[] = [];
  const candidates = await readdir(modules, { withFileTypes: true });
  for (const candidate of candidates) {
    if (candidate.name === ".bin") continue;
    const path = join(modules, candidate.name);
    if (candidate.name.startsWith("@")) {
      const scoped = await readdir(path, { withFileTypes: true });
      for (const child of scoped) {
        if (child.isDirectory() || child.isSymbolicLink()) {
          paths.push(join(path, child.name, "package.json"));
        }
      }
    } else if (candidate.isDirectory() || candidate.isSymbolicLink()) {
      paths.push(join(path, "package.json"));
    }
  }
  return paths;
}

const storeIndex = process.argv.indexOf("--store");
const store = resolve(
  storeIndex === -1
    ? "node_modules/.pnpm"
    : (process.argv[storeIndex + 1] ?? ""),
);
const entries = await readdir(store, { withFileTypes: true });
const inventory = new Map<string, string>();
const forbidden: string[] = [];
const failures: string[] = [];

for (const entry of entries.sort((left, right) =>
  left.name.localeCompare(right.name),
)) {
  if (!entry.isDirectory() || entry.name === "node_modules") continue;
  const modules = join(store, entry.name, "node_modules");
  let paths: string[];
  try {
    paths = await packageManifestPaths(modules);
  } catch {
    continue;
  }
  for (const manifestPath of paths) {
    let source: string;
    try {
      source = await readFile(manifestPath, "utf8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      failures.push(
        code === "ENOENT"
          ? "missing package manifest"
          : "cannot read package manifest",
      );
      continue;
    }
    let metadata: PackageMetadata;
    try {
      metadata = JSON.parse(source) as PackageMetadata;
    } catch {
      failures.push("cannot read package manifest");
      continue;
    }
    if (
      typeof metadata.name !== "string" ||
      typeof metadata.version !== "string"
    ) {
      failures.push("package manifest has invalid name/version");
      continue;
    }
    const license =
      typeof metadata.license === "string"
        ? metadata.license
        : (metadata.license?.type ??
          metadata.licenses
            ?.map((item) => item.type)
            .filter(Boolean)
            .join(" OR ") ??
          "UNKNOWN");
    const id = `${metadata.name}@${metadata.version}`;
    inventory.set(id, license);
    if (/\b(?:AGPL|GPL)(?:-|$)/iu.test(license)) {
      forbidden.push(`${id} (${license})`);
    }
  }
}

if (failures.length > 0) {
  console.error("License inventory failed:");
  for (const failure of [...new Set(failures)].sort()) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
if (inventory.size === 0) {
  console.error("License inventory failed: zero package manifests were read.");
  process.exit(1);
}
if (forbidden.length > 0) {
  console.error("Copyleft dependency review required:");
  for (const item of forbidden.sort()) console.error(`- ${item}`);
  process.exit(1);
}

const packages = [...inventory]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([id, license]) => ({ id, license }));
const summary = new Map<string, number>();
for (const { license } of packages) {
  summary.set(license, (summary.get(license) ?? 0) + 1);
}
console.log(
  JSON.stringify(
    {
      packages,
      summary: Object.fromEntries(
        [...summary].sort(([left], [right]) => left.localeCompare(right)),
      ),
    },
    null,
    2,
  ),
);
