import type { CaidoAdapter } from "../../../../core/src/caido/adapter.js";
import type { ToolDefinition } from "../../registry.js";
import { knowledgeTools } from "./knowledge.js";
import { projectTools } from "./project.js";
import { trafficTools } from "./traffic.js";

interface ReadToolOptions {
  bodyLimit: number;
  maxBatch: number;
}

export function createReadOnlyTools(
  adapter: CaidoAdapter,
  options: ReadToolOptions,
): ToolDefinition[] {
  return [
    ...projectTools(adapter, options.maxBatch),
    ...trafficTools(adapter, options.bodyLimit, options.maxBatch),
    ...knowledgeTools(adapter, options.bodyLimit, options.maxBatch),
  ];
}
