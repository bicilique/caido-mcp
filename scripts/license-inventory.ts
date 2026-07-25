import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type PackageMetadata = {
  name?: string;
  version?: string;
  license?: string | { type?: string };
  licenses?: Array<{ type?: string }>;
};

const store = resolve("node_modules/.pnpm");
const entries = await readdir(store, { withFileTypes: true });
const inventory = new Map<string, string>();
const forbidden: string[] = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const modules = join(store, entry.name, "node_modules");
  let packages: string[];
  try {
    packages = await readdir(modules);
  } catch {
    continue;
  }
  for (const candidate of packages) {
    if (candidate.startsWith(".")) continue;
    const paths = candidate.startsWith("@")
      ? await readdir(join(modules, candidate)).then((names) =>
          names.map((name) => join(modules, candidate, name, "package.json")),
        )
      : [join(modules, candidate, "package.json")];
    for (const manifestPath of paths) {
      let metadata: PackageMetadata;
      try {
        metadata = JSON.parse(
          await readFile(manifestPath, "utf8"),
        ) as PackageMetadata;
      } catch {
        continue;
      }
      if (metadata.name === undefined || metadata.version === undefined)
        continue;
      const license =
        typeof metadata.license === "string"
          ? metadata.license
          : (metadata.license?.type ??
            metadata.licenses
              ?.map((item) => item.type)
              .filter(Boolean)
              .join(" OR ") ??
            "UNKNOWN");
      inventory.set(`${metadata.name}@${metadata.version}`, license);
      if (/\b(?:AGPL|GPL)(?:-|$)/i.test(license)) {
        forbidden.push(`${metadata.name}@${metadata.version} (${license})`);
      }
    }
  }
}

if (forbidden.length > 0) {
  console.error("Copyleft dependency review required:");
  for (const item of forbidden.sort()) console.error(`- ${item}`);
  process.exitCode = 1;
} else {
  const counts = new Map<string, number>();
  for (const license of inventory.values()) {
    counts.set(license, (counts.get(license) ?? 0) + 1);
  }
  console.log(
    JSON.stringify(
      {
        packages: inventory.size,
        licenses: Object.fromEntries(
          [...counts].sort(([a], [b]) => a.localeCompare(b)),
        ),
      },
      null,
      2,
    ),
  );
}
