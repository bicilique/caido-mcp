import { AgentError, successResult } from "@caido-agent-kit/core";
import type { CaidoAdapter } from "@caido-agent-kit/core";
import { z } from "zod";

import type { ToolDefinition } from "../../registry.js";
import {
  ACTIVE_MUTATION_CONTRACTS,
  activeMutationDataSchema,
  asRecord,
  resultSchema,
} from "../shared.js";
import {
  activeAnnotations,
  mutationData,
  throwIfAborted,
  type ActiveToolOptions,
} from "./shared.js";

export function managementTools(
  adapter: CaidoAdapter,
  options: ActiveToolOptions,
): ToolDefinition[] {
  return [
    {
      name: "caido_select_project",
      description:
        "Selects exactly one existing Caido project and returns explicit mutation evidence. It performs no follow-up action and never retries automatically.",
      mode: "active",
      inputSchema: z.strictObject({
        projectId: z.string().min(1).max(256),
      }),
      outputSchema: resultSchema(
        "caido_select_project",
        activeMutationDataSchema("caido_select_project"),
      ),
      annotations: activeAnnotations(false, true, false),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const evidence = await adapter.selectProject(input.projectId as string);
        return asRecord(
          successResult(
            "caido_select_project",
            mutationData(
              ACTIVE_MUTATION_CONTRACTS.caido_select_project.summary,
              evidence,
            ),
            {
              ...(evidence.projectId === undefined
                ? {}
                : { projectId: evidence.projectId }),
              requestIds: [...evidence.requestIds],
            },
          ),
        );
      },
    },
    {
      name: "caido_create_finding",
      description:
        "Creates exactly one Caido finding from a bounded title, description, and request evidence ID. It never retries automatically.",
      mode: "active",
      inputSchema: z.strictObject({
        title: z.string().trim().min(1).max(256),
        description: z.string().max(options.bodyLimit),
        requestId: z.string().min(1).max(256),
      }),
      outputSchema: resultSchema(
        "caido_create_finding",
        activeMutationDataSchema("caido_create_finding"),
      ),
      annotations: activeAnnotations(false, false, false),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const evidence = await adapter.createFinding({
          title: input.title as string,
          description: input.description as string,
          requestId: input.requestId as string,
        });
        return asRecord(
          successResult(
            "caido_create_finding",
            mutationData(
              ACTIVE_MUTATION_CONTRACTS.caido_create_finding.summary,
              evidence,
            ),
            { requestIds: [...evidence.requestIds] },
          ),
        );
      },
    },
    {
      name: "caido_update_finding",
      description:
        "Updates exactly one Caido finding with bounded title and description fields. It never retries automatically.",
      mode: "active",
      inputSchema: z.strictObject({
        findingId: z.string().min(1).max(256),
        title: z.string().trim().min(1).max(256),
        description: z.string().max(options.bodyLimit),
      }),
      outputSchema: resultSchema(
        "caido_update_finding",
        activeMutationDataSchema("caido_update_finding"),
      ),
      annotations: activeAnnotations(true, true, false),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const evidence = await adapter.updateFinding(
          input.findingId as string,
          {
            title: input.title as string,
            description: input.description as string,
          },
        );
        return asRecord(
          successResult(
            "caido_update_finding",
            mutationData(
              ACTIVE_MUTATION_CONTRACTS.caido_update_finding.summary,
              evidence,
            ),
            { requestIds: [...evidence.requestIds] },
          ),
        );
      },
    },
    {
      name: "caido_set_intercept",
      description:
        "Sets Caido Intercept to one explicit enabled state and returns mutation evidence. The installed production SDK may return TOOL_DISABLED because it does not expose Intercept control. It never retries automatically.",
      mode: "active",
      inputSchema: z.strictObject({ enabled: z.boolean() }),
      outputSchema: resultSchema(
        "caido_set_intercept",
        activeMutationDataSchema("caido_set_intercept"),
      ),
      annotations: activeAnnotations(true, true, false),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const evidence = await adapter.setIntercept(input.enabled as boolean);
        return asRecord(
          successResult(
            "caido_set_intercept",
            mutationData(
              ACTIVE_MUTATION_CONTRACTS.caido_set_intercept.summary,
              evidence,
            ),
            { requestIds: [...evidence.requestIds] },
          ),
        );
      },
    },
    {
      name: "caido_run_workflow",
      description:
        "Unavailable because complete workflow outbound targets cannot be inspected before execution. It fails closed with TOOL_DISABLED and never invokes the workflow adapter.",
      mode: "active",
      inputSchema: z.strictObject({
        workflowId: z.string().min(1).max(256),
        requestId: z.string().min(1).max(256),
      }),
      outputSchema: resultSchema("caido_run_workflow", z.never()),
      annotations: activeAnnotations(true, false, true),
      handler: async (_input, signal) => {
        throwIfAborted(signal);
        throw new AgentError(
          "TOOL_DISABLED",
          "Workflow execution is unavailable because its complete outbound targets cannot be inspected safely.",
          false,
          "Use the read-only workflow tools to inspect configuration; execute the workflow manually in Caido after reviewing every outbound target.",
        );
      },
    },
  ];
}
