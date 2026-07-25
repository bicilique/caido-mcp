import { successResult } from "@caido-agent-kit/core";
import type { CaidoAdapter } from "@caido-agent-kit/core";
import { z } from "zod";

import type { ToolDefinition } from "../../registry.js";
import {
  asRecord,
  MutationDataSchema,
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
      outputSchema: resultSchema(MutationDataSchema),
      annotations: activeAnnotations(false, true, false),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const evidence = await adapter.selectProject(input.projectId as string);
        return asRecord(
          successResult(
            "caido_select_project",
            mutationData("Selected one Caido project.", evidence),
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
      outputSchema: resultSchema(MutationDataSchema),
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
            mutationData("Created one Caido finding.", evidence),
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
      outputSchema: resultSchema(MutationDataSchema),
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
            mutationData("Updated one Caido finding.", evidence),
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
      outputSchema: resultSchema(MutationDataSchema),
      annotations: activeAnnotations(true, true, false),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const evidence = await adapter.setIntercept(input.enabled as boolean);
        return asRecord(
          successResult(
            "caido_set_intercept",
            mutationData("Set Caido Intercept state.", evidence),
            { requestIds: [...evidence.requestIds] },
          ),
        );
      },
    },
    {
      name: "caido_run_workflow",
      description:
        "Runs exactly one bounded Caido workflow and returns mutation evidence. It performs no automatic retry or follow-up action.",
      mode: "active",
      inputSchema: z.strictObject({
        workflowId: z.string().min(1).max(256),
        requestId: z.string().min(1).max(256),
      }),
      outputSchema: resultSchema(MutationDataSchema),
      annotations: activeAnnotations(true, false, true),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const evidence = await adapter.runWorkflow(
          input.workflowId as string,
          input.requestId as string,
        );
        return asRecord(
          successResult(
            "caido_run_workflow",
            mutationData("Ran one Caido workflow.", evidence),
            { requestIds: [...evidence.requestIds] },
          ),
        );
      },
    },
  ];
}
