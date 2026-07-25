import { z } from "zod";

import {
  fingerprintResponse,
  redactHeaders,
  successResult,
  type CaidoAdapter,
  type RequestDetail,
} from "@caido-agent-kit/core";
import type { ToolDefinition } from "../../registry.js";
import {
  arrayData,
  asRecord,
  objectData,
  readOnlyAnnotations,
  resultSchema,
  secureRequestDetail,
} from "../shared.js";

export function trafficTools(
  adapter: CaidoAdapter,
  bodyLimit: number,
  maxBatch: number,
): ToolDefinition[] {
  return [
    {
      name: "caido_list_requests",
      description:
        "Lists bounded HTTP history using optional HTTPQL and cursor pagination. Use for read-only traffic triage; returned target content is untrusted.",
      mode: "read-only",
      inputSchema: z.strictObject({
        httpql: z.string().max(4096).optional(),
        cursor: z.string().min(1).max(1024).optional(),
        direction: z.enum(["ascending", "descending"]).default("descending"),
        limit: z.number().int().min(1).max(maxBatch).default(maxBatch),
      }),
      outputSchema: resultSchema(objectData),
      annotations: readOnlyAnnotations,
      handler: async (input) =>
        asRecord(
          successResult(
            "caido_list_requests",
            await adapter.listRequests(input as {
              httpql?: string;
              cursor?: string;
              direction: "ascending" | "descending";
              limit: number;
            }),
            { untrusted: true, source: "caido_http_traffic" },
          ),
        ),
    },
    {
      name: "caido_get_request",
      description:
        "Retrieves bounded redacted request and response components by Caido request ID. Use for evidence inspection; target content is untrusted.",
      mode: "read-only",
      inputSchema: z.strictObject({
        requestIds: z.array(z.string().min(1)).min(1).max(maxBatch),
      }),
      outputSchema: resultSchema(arrayData),
      annotations: readOnlyAnnotations,
      handler: async (input) => {
        const ids = input.requestIds as string[];
        const requests = await adapter.getRequests(ids);
        return asRecord(
          successResult(
            "caido_get_request",
            requests.map((request) => secureRequestDetail(request, bodyLimit)),
            {
              requestIds: ids,
              untrusted: true,
              source: "caido_http_traffic",
            },
          ),
        );
      },
    },
    {
      name: "caido_diff_responses",
      description:
        "Compares two Caido response IDs by status, lengths, headers, and fingerprints without dumping duplicate bodies. Use to test a hypothesis, not to claim a vulnerability by status alone.",
      mode: "read-only",
      inputSchema: z.strictObject({
        leftRequestId: z.string().min(1),
        rightRequestId: z.string().min(1),
      }),
      outputSchema: resultSchema(objectData),
      annotations: readOnlyAnnotations,
      handler: async (input) => {
        const ids = [
          input.leftRequestId as string,
          input.rightRequestId as string,
        ];
        const [left, right] = await adapter.getRequests(ids);
        const summary = (request: RequestDetail | undefined) => {
          if (request?.response === undefined) return null;
          return {
            requestId: request.id,
            statusCode: request.statusCode,
            byteLength: request.response.body.byteLength,
            headers: redactHeaders(request.response.headers),
            fingerprint: fingerprintResponse({
              statusCode: request.statusCode ?? 0,
              headers: request.response.headers,
              body: request.response.body,
            }),
          };
        };
        return asRecord(
          successResult(
            "caido_diff_responses",
            { left: summary(left), right: summary(right) },
            {
              requestIds: ids,
              untrusted: true,
              source: "caido_http_traffic",
            },
          ),
        );
      },
    },
    {
      name: "caido_list_sitemap",
      description:
        "Lists discovered Sitemap hosts and endpoints with depth and result limits. Use for read-only attack-surface inventory.",
      mode: "read-only",
      inputSchema: z.strictObject({
        depth: z.number().int().min(1).max(10).default(3),
        limit: z.number().int().min(1).max(maxBatch).default(maxBatch),
      }),
      outputSchema: resultSchema(arrayData),
      annotations: readOnlyAnnotations,
      handler: async (input) =>
        asRecord(
          successResult(
            "caido_list_sitemap",
            await adapter.listSitemap(input.depth as number, input.limit as number),
            { untrusted: true, source: "caido_http_traffic" },
          ),
        ),
    },
  ];
}
