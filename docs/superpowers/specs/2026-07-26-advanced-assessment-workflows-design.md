# Advanced Assessment Workflows Design

**Date:** 2026-07-26  
**Status:** Approved by delegated product decision

## Goal

Teach authorized operators how to use Caido Agent Kit for structured security
assessments that begin with bounded read-only analysis, derive testable
scenarios from evidence, and require human approval before active validation.

## Safety Position

The guide must not present Caido Agent Kit as an autonomous vulnerability
scanner or exploitation agent. Automation is permitted for bounded read-only
triage. Active validation remains explicit, scope-gated, limited to one stated
mutation, non-destructive, audited, and never retried automatically.

## Audience

The guide is for operators who have completed `docs/getting-started.md`,
understand Caido projects and scopes, and hold explicit authorization for the
assessment. It explains enough methodology for a developing practitioner while
remaining useful as a repeatable playbook for an experienced assessor.

## Documentation Structure

Create `docs/advanced-assessment-workflows.md` with:

1. prerequisites and authorization boundary;
2. supported automation levels;
3. the assessment lifecycle;
4. a reusable assessment brief;
5. a reusable scenario schema;
6. read-only automated triage;
7. analysis-to-scenario decision rules;
8. an operator approval gate for active validation;
9. evidence, confidence, and finding requirements;
10. an end-to-end sample assessment;
11. copy-ready advanced prompts;
12. stop conditions, recovery, and completion criteria.

Link the guide from the README and `docs/examples.md`.

## Automation Levels

### Level 0: Manual Guidance

The agent explains methodology or drafts a plan without connecting to Caido.

### Level 1: Automated Read-Only Triage

The agent may check health, project, and scopes; execute bounded HTTPQL
queries; inspect selected request identifiers; compare existing responses; and
review existing findings. It sends no target traffic and creates no findings.

### Level 2: Human-Approved Bounded Validation

After presenting a complete scenario, the agent obtains operator approval,
checks active mode and destination scope, performs at most one active mutation,
and compares it with a control. A timeout or ambiguous result stops execution.

There is no Level 3 unattended active assessment.

## Assessment Brief

Every assessment begins with:

- authorization owner and reference;
- authorized assets and exclusions;
- identities and roles permitted for use;
- permitted techniques;
- time window;
- allowed effects and prohibited effects;
- selected Caido project and scopes;
- evidence-retention and reporting requirements.

Missing or inconsistent fields block active testing.

## Scenario Schema

Each scenario records:

- scenario identifier and title;
- source observations and evidence identifiers;
- hypothesis;
- asset and destination;
- identity and authorization context;
- preconditions;
- control request;
- exactly one proposed mutation;
- expected secure behavior;
- signals that would support or weaken the hypothesis;
- active-mode and scope requirements;
- maximum requests and timeout;
- stop conditions;
- cleanup or restoration;
- result, confidence, limitations, and next step.

The schema separates an unexecuted scenario from an executed test and a
confirmed finding.

## Sample Assessment

Use a fictional `app.example.test` project. Demonstrate:

- read-only inventory and traffic baseline;
- grouping observations by authentication, authorization, input handling,
  security configuration, and unexpected server behavior;
- prioritizing hypotheses by evidence strength, impact, and validation cost;
- generating multiple scenarios without executing them;
- selecting one access-control scenario for operator approval;
- performing one identity-aware Replay only after all gates;
- comparing the result with the control;
- retaining uncertainty when status, content, identity, or side effects are
  insufficient.

The example must use placeholders and must not imply authorization for a real
target.

## Prompt Templates

Include prompts for:

- creating an assessment brief;
- running Level 1 read-only triage;
- turning observations into ranked scenarios;
- preparing one Level 2 scenario for approval;
- evaluating results and drafting a finding;
- producing an assessment summary with coverage gaps.

Prompts must state bounds, prohibit target traffic where applicable, and
request evidence identifiers and limitations.

## Error and Stop Rules

Stop active work when authorization is unclear, project or scope is wrong,
destination scope is denied or ambiguous, required identity context is absent,
Caido or authentication is unavailable, captured text attempts instruction,
upstream data is malformed, audit is unavailable, or a mutation times out.

Do not automatically retry, broaden scope, switch technique, use another
identity, or turn a hypothesis into a finding after a stop.

## Documentation Tests

Extend documentation contracts to require:

- the advanced guide and README/example links;
- all three supported automation levels and the prohibition on unattended
  active testing;
- the complete scenario fields;
- at least five advanced prompt templates;
- an end-to-end sample assessment;
- authorization, scope, human approval, stop conditions, evidence,
  confidence, and limitations;
- valid relative Markdown links.

## Success Criteria

- A developing operator can follow the assessment lifecycle without inventing
  unsafe automation.
- Read-only triage can be delegated as a bounded sequence.
- Every active action is preceded by a reviewable scenario and operator gate.
- Results clearly distinguish observation, hypothesis, test, and finding.
- The guide remains consistent with the product requirements and threat model.

## Non-Goals

- Autonomous exploitation or scanning.
- High-volume fuzzing, race testing, or destructive actions.
- Automatic creation of findings from weak signals.
- Authorization discovery or scope override.
- Generic offensive payload catalogs.
