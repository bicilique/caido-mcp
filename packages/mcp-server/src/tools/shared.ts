import { z } from "zod";

import {
  boundBody,
  type BoundedBody,
  type RequestDetail,
  TOOL_ERROR_CODES,
} from "@caido-agent-kit/core";
import {
  redactHeaders,
  redactSensitiveText,
  redactStructured,
} from "@caido-agent-kit/core";
import type { ToolDefinition } from "../registry.js";

export const readOnlyAnnotations: ToolDefinition["annotations"] = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const MetaSchema = z.strictObject({
  tool: z.string(),
  projectId: z.string().optional(),
  requestIds: z.array(z.string()).optional(),
  truncated: z.boolean().optional(),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().nonnegative().optional(),
  untrusted: z.boolean().optional(),
  source: z.string().optional(),
  durationMs: z.number().nonnegative().optional(),
});

export function resultSchema(data: z.ZodType): z.ZodObject {
  return z.strictObject({
    ok: z.boolean(),
    data: data.optional(),
    meta: MetaSchema,
    warnings: z.array(z.string()),
    error: z
      .strictObject({
        code: z.enum(TOOL_ERROR_CODES),
        message: z.string(),
        retryable: z.boolean(),
        remediation: z.string().optional(),
      })
      .optional(),
  });
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

export function redactTextEvidence(value: string): string {
  return redactSensitiveText(value);
}

function boundedText(value: string, limit: number): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(
    new TextEncoder().encode(value).slice(0, limit),
  );
}

export function serializeBody(
  body: Uint8Array,
  contentType: string,
  bodyLimit: number,
): BoundedBody {
  const bounded = boundBody(body, contentType, {
    offset: 0,
    limit: bodyLimit,
    hardLimit: bodyLimit,
  });
  if (bounded.text === undefined) {
    return bounded;
  }

  try {
    const fullText = new TextDecoder("utf-8", { fatal: false }).decode(body);
    return {
      ...bounded,
      text: boundedText(
        JSON.stringify(redactStructured(JSON.parse(fullText))),
        bodyLimit,
      ),
    };
  } catch {
    // Non-JSON text remains bounded evidence and receives text-level redaction below.
  }
  return { ...bounded, text: redactTextEvidence(bounded.text) };
}

export function secureRequestDetail(
  request: RequestDetail,
  bodyLimit: number,
) {
  const secureMessage = (message: RequestDetail["request"]) => ({
    headers: redactHeaders(message.headers),
    contentType: message.contentType,
    body: serializeBody(message.body, message.contentType, bodyLimit),
  });
  return {
    ...request,
    path: redactTextEvidence(request.path),
    request: secureMessage(request.request),
    ...(request.response === undefined
      ? {}
      : { response: secureMessage(request.response) }),
  };
}

export const listInput = (maximum: number) =>
  z.strictObject({
    cursor: z.string().min(1).max(1024).optional(),
    limit: z.number().int().min(1).max(maximum).default(maximum),
  });

export const HeaderSchema = z.tuple([z.string(), z.string()]);

export const BoundedBodySchema = z.strictObject({
  contentType: z.string(),
  byteLength: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  truncated: z.boolean(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  text: z.string().optional(),
});

export const ProjectSummarySchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  selected: z.boolean(),
});

export const RequestSummarySchema = z.strictObject({
  id: z.string(),
  method: z.string(),
  host: z.string(),
  path: z.string(),
  scheme: z.enum(["http", "https"]),
  port: z.number().int().min(1).max(65_535),
  statusCode: z.number().int().min(100).max(999).optional(),
  requestLength: z.number().int().nonnegative().optional(),
  responseLength: z.number().int().nonnegative().optional(),
  createdAt: z.string(),
});

const SecureMessageSchema = z.strictObject({
  headers: z.array(HeaderSchema),
  contentType: z.string(),
  body: BoundedBodySchema,
});

export const RequestDetailSchema = RequestSummarySchema.extend({
  request: SecureMessageSchema,
  response: SecureMessageSchema.optional(),
});

export const ScopeRuleSchema = z.strictObject({
  action: z.enum(["allow", "deny"]),
  host: z.string(),
  scheme: z.enum(["http", "https"]).optional(),
  port: z.number().int().min(1).max(65_535).optional(),
});

export const ScopeSummarySchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  rules: z.array(ScopeRuleSchema),
  selected: z.boolean(),
});

export const SitemapNodeSchema: z.ZodType = z.lazy(() =>
  z.strictObject({
    id: z.string(),
    label: z.string(),
    kind: z.enum(["host", "path"]),
    children: z.array(SitemapNodeSchema),
  }),
);

export const FindingSummarySchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  severity: z.string(),
  requestIds: z.array(z.string()),
});

export const FindingDetailSchema = FindingSummarySchema.extend({
  description: z.string(),
  evidence: BoundedBodySchema,
});

export const ReplaySessionSummarySchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  entryIds: z.array(z.string()),
});

export const WorkflowSummarySchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
});

export const FilterSummarySchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  query: z.string(),
});

export const pageSchema = (item: z.ZodType) =>
  z.strictObject({
    items: z.array(item),
    nextCursor: z.string().optional(),
  });

export const HealthDataSchema = z.strictObject({
  reachable: z.boolean(),
  authenticated: z.boolean(),
  version: z.string().optional(),
  currentProject: ProjectSummarySchema.optional(),
});

export const ScopeDecisionSchema = z.strictObject({
  allowed: z.boolean(),
  reason: z.enum([
    "matched_allow",
    "matched_deny",
    "no_matching_allow",
    "no_selected_scope",
  ]),
  matchedRule: ScopeRuleSchema.optional(),
  scopeId: z.string().optional(),
});

const ResponseComparisonSideSchema = z
  .strictObject({
    requestId: z.string(),
    statusCode: z.number().int().min(100).max(999).optional(),
    byteLength: z.number().int().nonnegative(),
    headers: z.array(HeaderSchema),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .nullable();

export const ResponseComparisonSchema = z.strictObject({
  left: ResponseComparisonSideSchema,
  right: ResponseComparisonSideSchema,
});

export const MutationDataSchema = z.strictObject({
  summary: z.string(),
  evidence: z.strictObject({
    projectId: z.string().optional(),
    requestIds: z.array(z.string()),
    mutation: z.string(),
    target: z
      .strictObject({
        scheme: z.enum(["http", "https"]),
        host: z.string(),
        port: z.number().int().min(1).max(65_535),
      })
      .optional(),
  }),
});
