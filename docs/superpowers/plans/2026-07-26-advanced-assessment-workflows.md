# Advanced Assessment Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete advanced guide for evidence-led, scenario-driven security assessments with bounded read-only automation and human-approved active validation.

**Architecture:** Keep assessment methodology in one focused guide, link it from the existing documentation path, and enforce its safety and completeness through documentation contracts. No runtime, tool, or Skill behavior changes.

**Tech Stack:** Markdown, TypeScript documentation contracts, Vitest 4

## Global Constraints

- Read-only automation may send no target traffic and create no findings.
- Active validation requires explicit authorization, active mode, selected scope, human approval, and at most one stated mutation.
- No active mutation is retried automatically.
- Observations, hypotheses, executed tests, and confirmed findings remain distinct.
- Examples use fictional assets and identifiers.

---

### Task 1: Advanced Scenario-Driven Assessment Guide

**Files:**
- Create: `docs/advanced-assessment-workflows.md`
- Modify: `README.md`
- Modify: `docs/examples.md`
- Modify: `tests/docs/documentation.test.ts`

**Interfaces:**
- Consumes: `docs/getting-started.md`, the read-only/active operating model, evidence response fields, and the project threat model.
- Produces: one linked advanced guide with reusable assessment and scenario templates.

- [ ] **Step 1: Write the failing documentation contract**

Add one test that loads the advanced guide and asserts:

```ts
expect(readme).toContain("docs/advanced-assessment-workflows.md");
expect(examples).toContain("advanced-assessment-workflows.md");
expect(advanced).toMatch(/^## Automation Levels$/m);
expect(advanced).toContain("Level 0");
expect(advanced).toContain("Level 1");
expect(advanced).toContain("Level 2");
expect(advanced).toMatch(/no Level 3|unattended active/i);
expect(advanced).toMatch(/^## Assessment Lifecycle$/m);
expect(advanced).toMatch(/^## Scenario Template$/m);
expect(advanced).toMatch(/^## End-to-End Sample Assessment$/m);
expect(advanced.match(/^### Prompt \d+:/gm)?.length ?? 0).toBeGreaterThanOrEqual(5);
```

Also assert the guide contains authorization, scope, human approval, one
mutation, stop conditions, evidence, confidence, limitations, control request,
identity context, expected secure behavior, cleanup, and no automatic retry.

- [ ] **Step 2: Run the documentation test and verify RED**

Run:

```bash
corepack pnpm test:docs
```

Expected: FAIL because `docs/advanced-assessment-workflows.md` and its links do
not exist.

- [ ] **Step 3: Write the advanced guide**

Use these top-level sections:

```markdown
## Before You Begin
## Automation Levels
## Assessment Lifecycle
## Assessment Brief Template
## Scenario Template
## Automated Read-Only Triage
## Turning Analysis into Scenarios
## Human Approval and Active Validation
## Evidence, Confidence, and Findings
## End-to-End Sample Assessment
## Advanced Prompt Library
## Stop Conditions and Recovery
## Completion Checklist
```

Include the exact Level 0/1/2 boundaries from the design. Provide reusable
Markdown templates for the assessment brief and scenario. Use a fictional
`app.example.test` sample that inventories evidence, ranks hypotheses, prepares
several scenarios, and walks one access-control scenario to the human approval
gate and one bounded Replay. Do not provide generic exploit payload catalogs.

- [ ] **Step 4: Link the guide**

Add **Running an assessment?** under README “Choose Your Path,” add the guide
to the README documentation list, and add an “Advanced assessment workflow”
section to `docs/examples.md` that directs users to the guide after the basic
examples.

- [ ] **Step 5: Run focused and repository documentation verification**

Run:

```bash
corepack pnpm format
corepack pnpm test:docs
corepack pnpm format:check
corepack pnpm lint
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/advanced-assessment-workflows.md docs/examples.md tests/docs/documentation.test.ts
git commit -m "docs: add advanced assessment workflows"
```
