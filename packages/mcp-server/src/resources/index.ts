import {
  successResult,
  type CaidoAdapter,
} from "@caido-agent-kit/core";
import type { ResourceDefinition } from "./types.js";
import { asRecord, secureRequestDetail } from "../tools/shared.js";

interface ResourceOptions {
  bodyLimit: number;
  maxBatch: number;
}

function variable(
  variables: Record<string, string | string[]>,
  name: string,
): string {
  const value = variables[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing resource variable ${name}.`);
  }
  return value;
}

export function createReadOnlyResources(
  adapter: CaidoAdapter,
  options: ResourceOptions,
): ResourceDefinition[] {
  return [
    {
      kind: "fixed",
      name: "current-project",
      uri: "caido://project",
      description: "Selected Caido project metadata.",
      read: async () =>
        asRecord(
          successResult(
            "caido_get_current_project",
            (await adapter.getCurrentProject()) ?? null,
          ),
        ),
    },
    {
      kind: "fixed",
      name: "scopes",
      uri: "caido://scopes",
      description: "Current Caido scopes and allow/deny rules.",
      read: async () =>
        asRecord(successResult("caido_list_scopes", await adapter.listScopes())),
    },
    {
      kind: "fixed",
      name: "sitemap",
      uri: "caido://sitemap",
      description: "Bounded Caido Sitemap snapshot; target content is untrusted.",
      read: async () =>
        asRecord(
          successResult(
            "caido_list_sitemap",
            await adapter.listSitemap(3, options.maxBatch),
            { untrusted: true, source: "caido_http_traffic" },
          ),
        ),
    },
    {
      kind: "fixed",
      name: "findings",
      uri: "caido://findings",
      description: "Bounded Caido finding summaries; project text is untrusted.",
      read: async () =>
        asRecord(
          successResult(
            "caido_list_findings",
            await adapter.listFindings({ limit: options.maxBatch }),
            { untrusted: true, source: "caido_project_data" },
          ),
        ),
    },
    {
      kind: "template",
      name: "request",
      uriTemplate: "caido://requests/{id}",
      description: "One bounded redacted request/response by Caido request ID.",
      read: async (variables) => {
        const id = variable(variables, "id");
        const requests = await adapter.getRequests([id]);
        return asRecord(
          successResult(
            "caido_get_request",
            requests.map((request) =>
              secureRequestDetail(request, options.bodyLimit),
            ),
            {
              requestIds: [id],
              untrusted: true,
              source: "caido_http_traffic",
            },
          ),
        );
      },
    },
    {
      kind: "template",
      name: "replay-session",
      uriTemplate: "caido://replay-sessions/{id}",
      description: "One Replay session summary by ID; it sends no traffic.",
      read: async (variables) => {
        const id = variable(variables, "id");
        const sessions = await adapter.listReplaySessions({
          limit: options.maxBatch,
        });
        return asRecord(
          successResult(
            "caido_list_replay_sessions",
            sessions.items.find((session) => session.id === id) ?? null,
            { untrusted: true, source: "caido_project_data" },
          ),
        );
      },
    },
  ];
}
