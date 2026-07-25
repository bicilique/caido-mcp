#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

function safeLabel(metadata) {
  const candidate = `${metadata.name ?? "unknown"}@${metadata.version ?? "unknown"}`;
  return candidate.replace(/[^@/A-Za-z0-9._+-]/gu, "?").slice(0, 160);
}

async function packageDirectories(modules) {
  await assertReadableDirectory(modules);
  const directories = [];
  const entries = await readdir(modules, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".bin") continue;
    const path = join(modules, entry.name);
    if (entry.name.startsWith("@")) {
      await assertReadableDirectory(path);
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

async function assertReadableDirectory(path) {
  const metadata = await stat(path);
  if (
    !metadata.isDirectory() ||
    (metadata.mode & 0o444) === 0 ||
    (metadata.mode & 0o111) === 0
  ) {
    throw new Error("unreadable package directory");
  }
}

async function assertReadableManifest(path) {
  const metadata = await stat(path);
  if (!metadata.isFile() || (metadata.mode & 0o444) === 0) {
    throw new Error("unreadable package manifest");
  }
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
  const darwinArm64 =
    /(?:darwin|macos|osx)[-_]?arm64|arm64[-_]?(?:darwin|macos|osx)/u.test(
      evidence,
    );
  const darwinX64 =
    /(?:darwin|macos|osx)[-_]?(?:x64|x86_64)|(?:x64|x86_64)[-_]?(?:darwin|macos|osx)|(?:darwin|macos|osx)[-_]?universal|universal[-_]?(?:darwin|macos|osx)/u.test(
      evidence,
    );
  return darwinArm64 && !darwinX64;
}

const store = resolve(process.argv[2] ?? "node_modules/.pnpm");
let entries;
try {
  await assertReadableDirectory(store);
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
    failures.push("unreadable package directory");
    continue;
  }
  for (const directory of directories) {
    const manifestPath = join(directory, "package.json");
    let metadata;
    try {
      await assertReadableManifest(manifestPath);
    } catch (error) {
      failures.push(
        error?.code === "ENOENT"
          ? "missing package manifest"
          : "unreadable package manifest",
      );
      continue;
    }
    let source;
    try {
      source = await readFile(manifestPath, "utf8");
    } catch {
      failures.push("unreadable package manifest");
      continue;
    }
    try {
      metadata = JSON.parse(source);
    } catch {
      failures.push("malformed package manifest");
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
    if (!supports(metadata.cpu, "x64")) {
      failures.push(`${label} does not support x64`);
    }
    if (binaryIsArm64Only(metadata)) {
      failures.push(`${label} darwin artifact is arm64-only`);
    }
  }
}

if (failures.length > 0) {
  console.error("Installed package verification failed:");
  for (const failure of [...new Set(failures)].sort()) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
if (packages.size === 0) {
  console.error(
    "Installed package verification failed: zero package manifests were scanned.",
  );
  process.exit(1);
}
console.log(
  `${packages.size} installed package manifests verified for macOS x64.`,
);
