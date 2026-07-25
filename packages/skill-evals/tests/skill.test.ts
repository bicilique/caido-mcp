import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface EvalCase {
  id: string;
  shouldActivateSkill: boolean;
  requiredTools: string[];
  forbiddenTools: string[];
  safety?: string[];
  fields?: string[];
  reference?: string;
}

const root = resolve(import.meta.dirname, "../../..");
const cases = JSON.parse(
  await readFile(resolve(root, "packages/skill-evals/cases/cases.json"), "utf8"),
) as EvalCase[];
const skillPath = resolve(root, "skills/caido-operator/SKILL.md");

describe("caido-operator skill", () => {
  it("defines all deterministic evaluation scenarios", () => {
    expect(cases).toHaveLength(20);
    expect(new Set(cases.map((entry) => entry.id)).size).toBe(20);
    expect(cases.filter((entry) => !entry.shouldActivateSkill)).toHaveLength(1);
  });

  it("has portable activation frontmatter and mandatory safety contracts", async () => {
    const skill = await readFile(skillPath, "utf8");

    expect(skill).toMatch(/^---\nname: caido-operator\n/);
    expect(skill).toMatch(/description: Use when /);
    expect(skill).toMatch(/explicit authorization/i);
    expect(skill).toMatch(/untrusted evidence/i);
    expect(skill).toMatch(/read-only/i);
    expect(skill).toMatch(/caido_health.*mode/is);
    expect(skill).toMatch(/user-stated authorization boundary/i);
    expect(skill).toMatch(/do not hash.*secret/i);
    expect(skill).toMatch(/Objective:\nScope:\nEvidence:/);
  });

  it("routes every conditional reference and names every required tool", async () => {
    const skill = await readFile(skillPath, "utf8");
    const requiredReferences = new Set(
      cases.flatMap((entry) => entry.reference ?? []),
    );
    const requiredTools = new Set(cases.flatMap((entry) => entry.requiredTools));

    for (const reference of requiredReferences) {
      expect(skill, reference).toContain(`references/${reference}`);
      await expect(
        readFile(resolve(root, "skills/caido-operator/references", reference), "utf8"),
      ).resolves.not.toHaveLength(0);
    }
    for (const tool of requiredTools) {
      expect(skill, tool).toContain(tool);
    }
  });
});
