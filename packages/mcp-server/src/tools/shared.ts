import { z } from "zod";

import type { RequestDetail } from "../../../core/src/caido/adapter.js";
import { boundBody, type BoundedBody } from "../../../core/src/security/body-limits.js";
import {
  redactHeaders,
  redactRawHttp,
  redactStructured,
} from "../../../core/src/security/redaction.js";
import type { ToolDefinition } from "../registry.js";

export const readOnlyAnnotations: ToolDefinition["annotations"] = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const MetaSchema = z.looseObject({
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
        code: z.string(),
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

const SENSITIVE_QUERY_VALUE = /([?&](?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token|x-csrf-token|x-xsrf-token|api[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|password|session(?:[_-]?id)?))=[^&#\s"'<>]*/gi;
const SENSITIVE_HEADER_LINE = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token|x-csrf-token|x-xsrf-token)\s*:\s*[^\r\n]*$/gim;
const JSON_CONTENT_TYPE = /\bapplication\/(?:json|[^;]+\+json)\b/i;

export function redactTextEvidence(value: string): string {
  return redactRawHttp(value)
    .replace(SENSITIVE_HEADER_LINE, "$1: [REDACTED]")
    .replace(SENSITIVE_QUERY_VALUE, "$1=[REDACTED]");
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

  if (JSON_CONTENT_TYPE.test(contentType)) {
    try {
      return {
        ...bounded,
        text: JSON.stringify(redactStructured(JSON.parse(bounded.text))),
      };
    } catch {
      // Invalid JSON remains text evidence and receives text-level redaction below.
    }
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

export const objectData = z.record(z.string(), z.unknown());
export const arrayData = z.array(objectData);
