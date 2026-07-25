import {
  AgentError,
  evaluateScope,
  normalizeTarget,
} from "@caido-agent-kit/core";
import type {
  CaidoAdapter,
  MutationEvidence,
  NormalizedTarget,
  RequestSummary,
} from "@caido-agent-kit/core";

import type { ToolDefinition } from "../../registry.js";

export function activeAnnotations(
  destructiveHint: boolean,
  idempotentHint: boolean,
  openWorldHint: boolean,
): ToolDefinition["annotations"] {
  return {
    readOnlyHint: false,
    destructiveHint,
    idempotentHint,
    openWorldHint,
  };
}

export interface ActiveToolOptions {
  bodyLimit: number;
  maxBatch: number;
}

export interface MutationResultData {
  summary: string;
  evidence: MutationEvidence & {
    target?: Pick<NormalizedTarget, "scheme" | "host" | "port">;
  };
}

function outOfScope(): AgentError {
  return new AgentError(
    "OUT_OF_SCOPE",
    "The active target is not allowed by exactly one selected Caido scope.",
    false,
    "Select one Caido scope containing an explicit allow rule for the normalized target.",
  );
}

export async function requireAllowedTarget(
  adapter: CaidoAdapter,
  targetUrl: string,
  signal: AbortSignal,
): Promise<NormalizedTarget> {
  let target: NormalizedTarget;
  try {
    target = normalizeTarget(targetUrl);
  } catch {
    throw outOfScope();
  }

  const selected = (await adapter.listScopes()).filter(
    (scope) => scope.selected,
  );
  throwIfAborted(signal);
  if (selected.length !== 1) {
    throw outOfScope();
  }
  if (!evaluateScope(target, selected[0]!.rules).allowed) {
    throw outOfScope();
  }
  return target;
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException("The active operation was aborted.", "AbortError");
  }
}

function urlHost(host: string): string {
  return host.includes(":") ? `[${host}]` : host;
}

export function requestTargetUrl(request: RequestSummary): string {
  const path = request.path.startsWith("/") ? request.path : `/${request.path}`;
  return `${request.scheme}://${urlHost(request.host)}:${request.port}${path}`;
}

export function mutationData(
  summary: string,
  evidence: MutationEvidence,
  target?: NormalizedTarget,
): MutationResultData {
  return {
    summary,
    evidence: {
      ...evidence,
      ...(target === undefined
        ? {}
        : {
            target: {
              scheme: target.scheme,
              host: target.host,
              port: target.port,
            },
          }),
    },
  };
}
