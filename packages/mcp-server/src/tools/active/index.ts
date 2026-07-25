import type { CaidoAdapter } from "@caido-agent-kit/core";

import type { ToolDefinition } from "../../registry.js";
import { managementTools } from "./management.js";
import { networkTools } from "./network.js";
import type { ActiveToolOptions } from "./shared.js";

export function createActiveTools(
  adapter: CaidoAdapter,
  options: ActiveToolOptions,
): ToolDefinition[] {
  return [
    ...managementTools(adapter, options),
    ...networkTools(adapter, options),
  ];
}
