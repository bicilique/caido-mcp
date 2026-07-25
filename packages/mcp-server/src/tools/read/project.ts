import { z } from "zod";

import {
  successResult,
  type CaidoAdapter,
  evaluateScope,
  normalizeTarget,
} from "@caido-agent-kit/core";
import type { ToolDefinition } from "../../registry.js";
import {
  asRecord,
  HealthDataSchema,
  listInput,
  pageSchema,
  ProjectSummarySchema,
  readOnlyAnnotations,
  resultSchema,
  ScopeDecisionSchema,
  ScopeSummarySchema,
} from "../shared.js";

export function projectTools(
  adapter: CaidoAdapter,
  maxBatch: number,
): ToolDefinition[] {
  return [
    {
      name: "caido_health",
      description:
        "Checks Caido reachability, authentication, version, and current project. Use before other Caido operations; it performs no mutation and returns no credentials.",
      mode: "read-only",
      inputSchema: z.strictObject({}),
      outputSchema: resultSchema("caido_health", HealthDataSchema),
      annotations: readOnlyAnnotations,
      handler: async () =>
        asRecord(successResult("caido_health", await adapter.health())),
    },
    {
      name: "caido_get_current_project",
      description:
        "Returns the selected Caido project. Use to establish evidence context; it has no side effects.",
      mode: "read-only",
      inputSchema: z.strictObject({}),
      outputSchema: resultSchema(
        "caido_get_current_project",
        ProjectSummarySchema.nullable(),
      ),
      annotations: readOnlyAnnotations,
      handler: async () =>
        asRecord(
          successResult(
            "caido_get_current_project",
            (await adapter.getCurrentProject()) ?? null,
          ),
        ),
    },
    {
      name: "caido_list_projects",
      description:
        "Lists Caido projects with bounded pagination. Use to identify a project; it does not select or modify one.",
      mode: "read-only",
      inputSchema: listInput(maxBatch),
      outputSchema: resultSchema(
        "caido_list_projects",
        pageSchema(ProjectSummarySchema),
      ),
      annotations: readOnlyAnnotations,
      handler: async (input) =>
        asRecord(
          successResult(
            "caido_list_projects",
            await adapter.listProjects(
              input as { cursor?: string; limit: number },
            ),
          ),
        ),
    },
    {
      name: "caido_list_scopes",
      description:
        "Lists Caido scopes and allow/deny rules. Use before active testing; it sends no traffic.",
      mode: "read-only",
      inputSchema: z.strictObject({}),
      outputSchema: resultSchema(
        "caido_list_scopes",
        z.array(ScopeSummarySchema),
      ),
      annotations: readOnlyAnnotations,
      handler: async () =>
        asRecord(
          successResult("caido_list_scopes", await adapter.listScopes()),
        ),
    },
    {
      name: "caido_is_in_scope",
      description:
        "Evaluates one URL against the selected Caido scope without sending traffic. Use before proposing an active request.",
      mode: "read-only",
      inputSchema: z.strictObject({ url: z.url().max(4096) }),
      outputSchema: resultSchema("caido_is_in_scope", ScopeDecisionSchema),
      annotations: readOnlyAnnotations,
      handler: async (input) => {
        const scopes = await adapter.listScopes();
        const selected = scopes.find((scope) => scope.selected);
        const decision = evaluateScope(
          normalizeTarget(input.url as string),
          selected?.rules ?? [],
        );
        return asRecord(
          successResult("caido_is_in_scope", {
            ...decision,
            scopeId: selected?.id,
          }),
        );
      },
    },
  ];
}
