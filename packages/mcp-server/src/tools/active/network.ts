import { AgentError, successResult } from "@caido-agent-kit/core";
import type { CaidoAdapter, RawMessage } from "@caido-agent-kit/core";
import { z } from "zod";

import type { ToolDefinition } from "../../registry.js";
import { asRecord, objectData, resultSchema } from "../shared.js";
import {
  activeAnnotations,
  mutationData,
  requestTargetUrl,
  requireAllowedTarget,
  throwIfAborted,
  type ActiveToolOptions,
} from "./shared.js";

const headerName = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/)
  .refine((name) => name.toLowerCase() !== "host");
const headerValue = z
  .string()
  .max(8192)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const headerSchema = z.tuple([headerName, headerValue]);

export function networkTools(
  adapter: CaidoAdapter,
  options: ActiveToolOptions,
): ToolDefinition[] {
  const headers = z.array(headerSchema).max(100);
  return [
    {
      name: "caido_replay_request",
      description:
        "Replays exactly one bounded request after resolving its normalized destination and requiring one selected Caido scope to allow it. It never retries automatically.",
      mode: "active",
      inputSchema: z.strictObject({
        requestId: z.string().min(1).max(256),
        headers,
        body: z.string().max(options.bodyLimit),
        contentType: z.string().min(1).max(256),
      }),
      outputSchema: resultSchema(objectData),
      annotations: activeAnnotations(true, false, true),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const requestId = input.requestId as string;
        const requests = await adapter.getRequests([requestId]);
        throwIfAborted(signal);
        if (requests.length !== 1 || requests[0]?.id !== requestId) {
          throw new AgentError(
            "NOT_FOUND",
            "The requested Caido request does not exist.",
            false,
          );
        }
        const target = await requireAllowedTarget(
          adapter,
          requestTargetUrl(requests[0]),
          signal,
        );
        const raw: RawMessage = {
          headers: input.headers as readonly (readonly [string, string])[],
          body: new TextEncoder().encode(input.body as string),
          contentType: input.contentType as string,
        };
        throwIfAborted(signal);
        const evidence = await adapter.replayRequest(requestId, raw);
        return asRecord(
          successResult(
            "caido_replay_request",
            mutationData("Replayed one bounded request.", evidence, target),
            { requestIds: [...evidence.requestIds], untrusted: true },
          ),
        );
      },
    },
    {
      name: "caido_send_raw_request",
      description:
        "Sends exactly one bounded HTTP request after normalizing scheme, host, and port and requiring one selected Caido scope to allow it. It never retries automatically.",
      mode: "active",
      inputSchema: z.strictObject({
        method: z.enum([
          "GET",
          "HEAD",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "OPTIONS",
        ]),
        url: z.url().max(4096),
        headers,
        body: z.string().max(options.bodyLimit).optional(),
      }),
      outputSchema: resultSchema(objectData),
      annotations: activeAnnotations(true, false, true),
      handler: async (input, signal) => {
        throwIfAborted(signal);
        const target = await requireAllowedTarget(
          adapter,
          input.url as string,
          signal,
        );
        throwIfAborted(signal);
        const evidence = await adapter.sendRawRequest({
          method: input.method as string,
          url: target.url,
          headers: input.headers as readonly (readonly [string, string])[],
          ...(input.body === undefined
            ? {}
            : { body: new TextEncoder().encode(input.body as string) }),
        });
        return asRecord(
          successResult(
            "caido_send_raw_request",
            mutationData("Sent one bounded raw request.", evidence, target),
            { requestIds: [...evidence.requestIds], untrusted: true },
          ),
        );
      },
    },
  ];
}
