import { spawnSync } from "node:child_process";

const gates = [
  "format:check",
  "lint",
  "typecheck",
  "test:unit",
  "test:contract",
  "test:integration",
  "test:skill",
  "eval:skill",
  "test:docs",
  "check:generated",
  "coverage",
  "build",
  "audit:high",
  "scan:secrets",
  "license:inventory",
] as const;

for (const gate of gates) {
  console.error(`[release-check] ${gate}`);
  const result = spawnSync("corepack", ["pnpm", gate], {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
