import type { CaidoAdapter } from "../../../core/src/caido/adapter.js";

export function createTestAdapter(
  overrides: Partial<CaidoAdapter> = {},
): CaidoAdapter {
  return {
    health: async () => ({ reachable: false, authenticated: false }),
    getCurrentProject: async () => undefined,
    listProjects: async () => ({ items: [] }),
    listRequests: async () => ({ items: [] }),
    getRequests: async () => [],
    listSitemap: async () => [],
    listScopes: async () => [],
    listFindings: async () => ({ items: [] }),
    getFinding: async () => undefined,
    listReplaySessions: async () => ({ items: [] }),
    listWorkflows: async () => ({ items: [] }),
    listFilters: async () => ({ items: [] }),
    selectProject: async () => ({ requestIds: [], mutation: "select_project" }),
    replayRequest: async () => ({ requestIds: [], mutation: "replay_request" }),
    sendRawRequest: async () => ({ requestIds: [], mutation: "send_raw_request" }),
    createFinding: async () => ({ requestIds: [], mutation: "create_finding" }),
    updateFinding: async () => ({ requestIds: [], mutation: "update_finding" }),
    setIntercept: async () => ({ requestIds: [], mutation: "set_intercept" }),
    runWorkflow: async () => ({ requestIds: [], mutation: "run_workflow" }),
    close: async () => undefined,
    ...overrides,
  };
}
