import { z } from "zod";

import { AgentError } from "../errors.js";
import type {
  FilterSummary,
  FindingDetail,
  FindingSummary,
  Page,
  ProjectSummary,
  RawMessage,
  ReplaySessionSummary,
  RequestDetail,
  RequestSummary,
  ScopeSummary,
  WorkflowSummary,
} from "./adapter.js";

const bytesSchema = z.custom<Uint8Array>(
  (value) => value instanceof Uint8Array,
);

export const sdkHealthSchema = z.object({
  name: z.string(),
  version: z.string(),
  ready: z.boolean(),
});

export const sdkProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  status: z.enum(["ERROR", "READY", "RESTORING"]),
  temporary: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.string(),
  size: z.number(),
  readOnly: z.boolean(),
});

export const sdkScopeSchema = z.object({
  id: z.string(),
  name: z.string(),
  allowlist: z.array(z.string()),
  denylist: z.array(z.string()),
  indexed: z.boolean(),
});

const sdkRequestSchema = z.object({
  id: z.string(),
  host: z.string(),
  port: z.number().int(),
  method: z.string(),
  path: z.string(),
  query: z.string(),
  isTls: z.boolean(),
  metadata: z.object({ id: z.string(), color: z.string().optional() }),
  createdAt: z.date(),
  raw: bytesSchema.optional(),
});

const sdkResponseSchema = z.object({
  id: z.string(),
  statusCode: z.number().int(),
  roundtripTime: z.number(),
  length: z.number().int(),
  createdAt: z.date(),
  raw: bytesSchema.optional(),
});

export const sdkRequestResponseSchema = z.object({
  request: sdkRequestSchema,
  response: sdkResponseSchema.optional(),
});

export const sdkFindingSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  title: z.string(),
  reporter: z.string(),
  description: z.string().optional(),
  dedupeKey: z.string().optional(),
  host: z.string(),
  path: z.string(),
  hidden: z.boolean(),
  createdAt: z.date(),
});

export const sdkReplaySessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  collectionId: z.string(),
  activeEntryId: z.string().optional(),
});

export const sdkWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  definition: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  global: z.boolean(),
  readOnly: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const sdkFilterSchema = z.object({
  id: z.string(),
  name: z.string(),
  alias: z.string(),
  clause: z.string(),
  kind: z.enum(["HTTPQL", "StreamQL"]),
});

function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AgentError(
      "UPSTREAM_ERROR",
      "Caido returned data that does not match the supported SDK contract.",
      true,
      "Upgrade Caido or the agent kit to compatible versions, then retry.",
    );
  }
  return result.data;
}

export function mapProject(
  value: unknown,
  selectedProjectId?: string,
): ProjectSummary {
  const project = validated(sdkProjectSchema, value);
  return {
    id: project.id,
    name: project.name,
    selected: project.id === selectedProjectId,
  };
}

function rawMessage(raw: Uint8Array | undefined): RawMessage {
  if (raw === undefined) {
    return {
      headers: [],
      body: new Uint8Array(),
      contentType: "application/octet-stream",
    };
  }
  const bytes = Buffer.from(raw);
  const separator = bytes.indexOf(Buffer.from("\r\n\r\n"));
  const head = bytes
    .subarray(0, separator === -1 ? bytes.length : separator)
    .toString("latin1");
  const lines = head.split("\r\n").slice(1);
  const headers = lines.flatMap((line) => {
    const colon = line.indexOf(":");
    return colon === -1
      ? []
      : [
          [
            line.slice(0, colon).trim(),
            line.slice(colon + 1).trim(),
          ] as const,
        ];
  });
  const contentType =
    headers.find(([name]) => name.toLowerCase() === "content-type")?.[1] ??
    "application/octet-stream";
  return {
    headers,
    body:
      separator === -1
        ? new Uint8Array()
        : new Uint8Array(bytes.subarray(separator + 4)),
    contentType,
  };
}

export function mapRequestSummary(value: unknown): RequestSummary {
  const { request, response } = validated(sdkRequestResponseSchema, value);
  return {
    id: request.id,
    method: request.method,
    host: request.host,
    path: request.query === "" ? request.path : `${request.path}?${request.query}`,
    scheme: request.isTls ? "https" : "http",
    port: request.port,
    ...(response === undefined ? {} : { statusCode: response.statusCode }),
    requestLength: request.raw?.byteLength ?? 0,
    ...(response === undefined ? {} : { responseLength: response.length }),
    createdAt: request.createdAt.toISOString(),
  };
}

export function mapRequestDetail(value: unknown): RequestDetail {
  const pair = validated(sdkRequestResponseSchema, value);
  return {
    ...mapRequestSummary(pair),
    request: rawMessage(pair.request.raw),
    ...(pair.response === undefined
      ? {}
      : { response: rawMessage(pair.response.raw) }),
  };
}

export function mapScope(value: unknown): ScopeSummary {
  const scope = validated(sdkScopeSchema, value);
  return {
    id: scope.id,
    name: scope.name,
    selected: scope.indexed,
    rules: [
      ...scope.allowlist.map((host) => ({ action: "allow" as const, host })),
      ...scope.denylist.map((host) => ({ action: "deny" as const, host })),
    ],
  };
}

export function mapFindingSummary(value: unknown): FindingSummary {
  const finding = validated(sdkFindingSchema, value);
  return {
    id: finding.id,
    title: finding.title,
    severity: "unknown",
    requestIds: [finding.requestId],
  };
}

export function mapFindingDetail(value: unknown): FindingDetail {
  const finding = validated(sdkFindingSchema, value);
  return {
    ...mapFindingSummary(finding),
    description: finding.description ?? "",
    evidence: `https://${finding.host}${finding.path}`,
  };
}

export function mapReplaySession(
  value: unknown,
  entryIds: readonly string[],
): ReplaySessionSummary {
  const session = validated(sdkReplaySessionSchema, value);
  return { id: session.id, name: session.name, entryIds };
}

export function mapWorkflow(value: unknown): WorkflowSummary {
  const workflow = validated(sdkWorkflowSchema, value);
  return {
    id: workflow.id,
    name: workflow.name,
    enabled: workflow.enabled,
  };
}

export function mapFilter(value: unknown): FilterSummary {
  const filter = validated(sdkFilterSchema, value);
  return { id: filter.id, name: filter.name, query: filter.clause };
}

export function mapConnection<T>(
  value: {
    readonly edges: readonly { readonly node: unknown }[];
    readonly pageInfo: {
      readonly hasNextPage: boolean;
      readonly endCursor?: string;
    };
  },
  mapper: (node: unknown) => T,
): Page<T> {
  const items = value.edges.map(({ node }) => mapper(node));
  return {
    items,
    ...(value.pageInfo.hasNextPage && value.pageInfo.endCursor !== undefined
      ? { nextCursor: value.pageInfo.endCursor }
      : {}),
  };
}

export function paginate<T>(
  items: readonly T[],
  limit: number,
  cursor?: string,
): Page<T> {
  const start = cursor === undefined ? 0 : Number(cursor.replace(/^offset:/, ""));
  if (!Number.isSafeInteger(start) || start < 0) {
    throw new AgentError("INVALID_INPUT", "The page cursor is invalid.", false);
  }
  const pageItems = items.slice(start, start + limit);
  const next = start + pageItems.length;
  return {
    items: pageItems,
    ...(next < items.length ? { nextCursor: `offset:${next}` } : {}),
  };
}
