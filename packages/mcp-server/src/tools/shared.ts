import { z } from "zod";

import type { RequestDetail } from "../../../core/src/caido/adapter.js";
import { boundBody, type BoundedBody } from "../../../core/src/security/body-limits.js";
import {
  redactHeaders,
  redactSensitiveText,
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

export const objectData = z.record(z.string(), z.unknown());
export const arrayData = z.array(objectData);
