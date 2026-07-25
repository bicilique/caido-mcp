#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

function safeLabel(metadata) {
  const candidate = `${metadata.name ?? "unknown"}@${metadata.version ?? "unknown"}`;
  return candidate.replace(/[^@/A-Za-z0-9._+-]/gu, "?").slice(0, 160);
}

async function packageDirectories(modules) {
  const directories = [];
  const entries = await readdir(modules, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".bin") continue;
    const path = join(modules, entry.name);
    if (entry.name.startsWith("@")) {
      const scoped = await readdir(path, { withFileTypes: true });
      for (const child of scoped) {
        if (child.isDirectory() || child.isSymbolicLink()) {
          directories.push(join(path, child.name));
        }
      }
    } else if (entry.isDirectory() || entry.isSymbolicLink()) {
      directories.push(path);
    }
  }
  return directories;
}

function supports(values, target) {
  if (!Array.isArray(values)) return true;
  if (values.includes(`!${target}`)) return false;
  const positive = values.filter((value) => !value.startsWith("!"));
  return positive.length === 0 || positive.includes(target);
}

function binaryIsArm64Only(metadata) {
  const evidence = JSON.stringify({
    name: metadata.name,
    binary: metadata.binary,
    bin: metadata.bin,
  }).toLowerCase();
  return (
    /(?:darwin|macos|osx)[-_]?arm64|arm64[-_]?(?:darwin|macos|osx)/u.test(
      evidence,
    ) && !/(?:x64|x86_64|universal)/u.test(evidence)
  );
}

const store = resolve(process.argv[2] ?? "node_modules/.pnpm");
let entries;
try {
  entries = await readdir(store, { withFileTypes: true });
} catch {
  console.error(
    "Installed package verification failed: pnpm store is unreadable.",
  );
  process.exit(1);
}

const packages = new Map();
const failures = [];
for (const entry of entries.sort((left, right) =>
  left.name.localeCompare(right.name),
)) {
  if (!entry.isDirectory() || entry.name === "node_modules") continue;
  const modules = join(store, entry.name, "node_modules");
  let directories;
  try {
    directories = await packageDirectories(modules);
  } catch {
    continue;
  }
  for (const directory of directories) {
    let metadata;
    try {
      metadata = JSON.parse(
        await readFile(join(directory, "package.json"), "utf8"),
      );
    } catch {
      continue;
    }
    if (
      typeof metadata.name !== "string" ||
      typeof metadata.version !== "string"
    ) {
      failures.push("a package has invalid name/version metadata");
      continue;
    }
    packages.set(`${metadata.name}@${metadata.version}`, metadata);
    const label = safeLabel(metadata);
    if (!supports(metadata.os, "darwin")) {
      failures.push(`${label} does not support darwin`);
    }
    if (!supports(metadata.cpu, "x64") || binaryIsArm64Only(metadata)) {
      failures.push(`${label} is arm64-only`);
    }
  }
}

if (packages.size === 0) {
  console.error(
    "Installed package verification failed: zero package manifests were scanned.",
  );
  process.exit(1);
}
if (failures.length > 0) {
  console.error("Installed package verification failed:");
  for (const failure of [...new Set(failures)].sort()) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
console.log(
  `${packages.size} installed package manifests verified for macOS x64.`,
);
