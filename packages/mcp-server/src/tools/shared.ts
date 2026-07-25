import { z } from "zod";

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

export const listInput = (maximum: number) =>
  z.strictObject({
    cursor: z.string().min(1).max(1024).optional(),
    limit: z.number().int().min(1).max(maximum).default(maximum),
  });

export const objectData = z.record(z.string(), z.unknown());
export const arrayData = z.array(objectData);
