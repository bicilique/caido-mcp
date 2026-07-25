#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = await readFile(resolve(root, "SKILL.md"), "utf8");
const frontmatter = skill.match(/^---\n([^]*?)\n---/u)?.[1] ?? "";
if (!/^name:\s+caido-operator$/mu.test(frontmatter)) {
  throw new Error("SKILL.md must declare name: caido-operator.");
}
if (!/^description:\s+\S.+$/mu.test(frontmatter)) {
  throw new Error("SKILL.md must declare a non-empty description.");
}
const links = [...skill.matchAll(/\]\((references\/[^)#]+\.md)\)/gu)].map(
  (match) => match[1],
);
for (const link of new Set(links)) {
  await access(resolve(root, link));
}
if (skill.split(/\s+/u).length > 5_000) {
  throw new Error(
    "SKILL.md exceeds the 5,000-word progressive-disclosure limit.",
  );
}
console.log(`Skill verified (${new Set(links).size} routed references).`);
