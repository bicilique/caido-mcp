import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  errorResult,
  type CaidoAdapter,
  type RequestDetail,
} from "@caido-agent-kit/core";
import type { ToolDefinition } from "../src/registry.js";
import { createActiveTools } from "../src/tools/active/index.js";
import { createReadOnlyTools } from "../src/tools/read/index.js";
import {
  assertDocumentedRegistry,
  renderToolReference,
} from "../../../scripts/generate-tool-reference.js";
import { createTestAdapter } from "./support/adapter.js";

const requestMessage = {
  headers: [] as const,
  body: new TextEncoder().encode("ok"),
  contentType: "text/plain",
};
const requestDetail: RequestDetail = {
  id: "req-1",
  method: "GET",
  host: "example.test",
  path: "/",
  scheme: "https",
  port: 443,
  statusCode: 200,
  requestLength: 0,
  responseLength: 2,
  createdAt: "2026-07-25T00:00:00.000Z",
  request: requestMessage,
  response: requestMessage,
};

function populatedAdapter(): CaidoAdapter {
  return createTestAdapter({
    health: async () => ({
      reachable: true,
      authenticated: true,
      version: "1.0.0",
      currentProject: { id: "project-1", name: "Project", selected: true },
    }),
    getCurrentProject: async () => ({
      id: "project-1",
      name: "Project",
      selected: true,
    }),
    listProjects: async () => ({
      items: [{ id: "project-1", name: "Project", selected: true }],
    }),
    listRequests: async () => ({ items: [requestDetail] }),
    getRequests: async (ids) => ids.map((id) => ({ ...requestDetail, id })),
    listSitemap: async () => [
      {
        id: "host-1",
        label: "example.test",
        kind: "host",
        children: [{ id: "path-1", label: "/", kind: "path", children: [] }],
      },
    ],
    listScopes: async () => [
      {
        id: "scope-1",
        name: "Scope",
        selected: true,
        rules: [
          {
            action: "allow",
            host: "example.test",
            scheme: "https",
            port: 443,
          },
        ],
      },
    ],
    listFindings: async () => ({
      items: [
        {
          id: "finding-1",
          title: "Finding",
          severity: "medium",
          requestIds: ["req-1"],
        },
      ],
    }),
    getFinding: async () => ({
      id: "finding-1",
      title: "Finding",
      severity: "medium",
      requestIds: ["req-1"],
      description: "Description",
      evidence: "Evidence",
    }),
    listReplaySessions: async () => ({
      items: [{ id: "replay-1", name: "Replay", entryIds: ["req-1"] }],
    }),
    listWorkflows: async () => ({
      items: [{ id: "workflow-1", name: "Workflow", enabled: true }],
    }),
    listFilters: async () => ({
      items: [{ id: "filter-1", name: "Filter", query: 'req.method.eq:"GET"' }],
    }),
    selectProject: async () => ({
      projectId: "project-1",
      requestIds: [],
      mutation: "select_project",
    }),
  });
}

const validInputs: Readonly<Record<string, Record<string, unknown>>> = {
  caido_health: {},
  caido_get_current_project: {},
  caido_list_projects: { limit: 20 },
  caido_list_scopes: {},
  caido_is_in_scope: { url: "https://example.test/" },
  caido_list_requests: { direction: "descending", limit: 20 },
  caido_get_request: { requestIds: ["req-1"] },
  caido_diff_responses: {
    leftRequestId: "req-1",
    rightRequestId: "req-2",
  },
  caido_list_sitemap: { depth: 3, limit: 20 },
  caido_list_findings: { limit: 20 },
  caido_get_finding: { id: "finding-1" },
  caido_list_replay_sessions: { limit: 20 },
  caido_list_workflows: { limit: 20 },
  caido_list_filters: { limit: 20 },
  caido_select_project: { projectId: "project-1" },
  caido_create_finding: {
    title: "Finding",
    description: "Description",
    requestId: "req-1",
  },
  caido_update_finding: {
    findingId: "finding-1",
    title: "Finding",
    description: "Description",
  },
  caido_set_intercept: { enabled: true },
  caido_run_workflow: { workflowId: "workflow-1", requestId: "req-1" },
  caido_replay_request: {
    requestId: "req-1",
    headers: [],
    body: "",
    contentType: "text/plain",
  },
  caido_send_raw_request: {
    method: "GET",
    url: "https://example.test/",
    headers: [],
  },
};

function outputSchemaFromSection(document: string, toolName: string): unknown {
  const section = document.split(`## \`${toolName}\``)[1]?.split("\n## `")[0];
  const json = section?.match(
    /\*\*Output schema:\*\*[^]*?```json\n([^]*?)\n```/,
  )?.[1];
  if (json === undefined) {
    throw new Error(`Missing documented output schema for ${toolName}.`);
  }
  return JSON.parse(json);
}

describe("generated tool reference", () => {
  const adapter = populatedAdapter();
  const options = {
    bodyLimit: 4096,
    maxBatch: 20,
  };
  const tools = [
    ...createReadOnlyTools(adapter, options),
    ...createActiveTools(adapter, options),
  ];

  it("matches every tool in the canonical MCP registry", async () => {
    const generated = renderToolReference(tools);
    const committed = await readFile(
      resolve(
        import.meta.dirname,
        "../../../skills/caido-operator/references/tool-selection.md",
      ),
      "utf8",
    );

    expect(generated).toContain("## `caido_health`");
    expect(generated).toContain("## `caido_replay_request`");
    expect(generated.match(/^## `caido_/gm)).toHaveLength(21);
    expect(committed).toBe(generated);
  });

  it("rejects missing registry descriptions, annotations, and schemas", () => {
    const invalid = {
      ...tools[0],
      description: "",
      annotations: undefined,
      inputSchema: undefined,
      outputSchema: undefined,
    } as unknown as ToolDefinition;

    expect(() =>
      assertDocumentedRegistry([invalid], "Call `caido_health`."),
    ).toThrow(/description[^]*annotation[^]*(input|output) schema/is);
  });

  it("requires exactly the four supported boolean annotation keys", () => {
    const { openWorldHint: _omitted, ...missing } = tools[0]!.annotations;
    const extra = { ...tools[0]!.annotations, futureHint: false };

    expect(() =>
      assertDocumentedRegistry(
        [{ ...tools[0]!, annotations: missing } as ToolDefinition],
        "Call `caido_health`.",
      ),
    ).toThrow(/exactly four annotation keys/i);
    expect(() =>
      assertDocumentedRegistry(
        [{ ...tools[0]!, annotations: extra } as ToolDefinition],
        "Call `caido_health`.",
      ),
    ).toThrow(/exactly four annotation keys/i);
  });

  it("rejects Skill references to tools absent from the registry", () => {
    expect(() =>
      assertDocumentedRegistry(tools, "Call `caido_not_registered`."),
    ).toThrow(/Skill references unregistered tool: caido_not_registered/);
  });

  it("uses an exact stable error enum in every output envelope", () => {
    for (const tool of tools) {
      const schema = tool.outputSchema;
      const wrongError = {
        ok: false,
        meta: { tool: tool.name },
        warnings: [],
        error: {
          code: "ANY_ARBITRARY_ERROR",
          message: "bad",
          retryable: false,
        },
      };

      expect(schema.safeParse(wrongError).success, tool.name).toBe(false);
    }
  });

  it("rejects malformed output data that generic records accepted", () => {
    const readTools = createReadOnlyTools(createTestAdapter(), {
      bodyLimit: 4096,
      maxBatch: 20,
    });
    const listRequests = readTools.find(
      (tool) => tool.name === "caido_list_requests",
    )!;
    const health = readTools.find((tool) => tool.name === "caido_health")!;

    expect(
      listRequests.outputSchema.safeParse({
        ok: true,
        data: { arbitrary: "previously accepted" },
        meta: { tool: "caido_list_requests" },
        warnings: [],
      }).success,
    ).toBe(false);
    expect(
      health.outputSchema.safeParse({
        ok: true,
        data: { reachable: "yes", authenticated: true },
        meta: { tool: "caido_health" },
        warnings: [],
      }).success,
    ).toBe(false);

    for (const tool of tools) {
      expect(
        tool.outputSchema.safeParse({
          ok: true,
          data: { arbitrary: "previously accepted" },
          meta: { tool: tool.name },
          warnings: [],
        }).success,
        tool.name,
      ).toBe(false);
    }
  });

  it("enforces discriminated result states and the exact meta tool literal", () => {
    for (const tool of tools) {
      const base = { meta: { tool: tool.name }, warnings: [] };
      const error = {
        code: "INTERNAL_ERROR",
        message: "Safe error.",
        retryable: false,
      };

      expect(tool.outputSchema.safeParse({ ok: true, ...base }).success).toBe(
        false,
      );
      expect(
        tool.outputSchema.safeParse({
          ok: true,
          data: {},
          error,
          ...base,
        }).success,
      ).toBe(false);
      expect(tool.outputSchema.safeParse({ ok: false, ...base }).success).toBe(
        false,
      );
      expect(
        tool.outputSchema.safeParse({
          ok: false,
          data: {},
          error,
          ...base,
        }).success,
      ).toBe(false);
      expect(
        tool.outputSchema.safeParse({
          ok: false,
          error,
          meta: { tool: "caido_wrong_tool" },
          warnings: [],
        }).success,
      ).toBe(false);
      expect(
        tool.outputSchema.safeParse({
          ok: false,
          error,
          meta: { tool: tool.name, extra: true },
          warnings: [],
        }).success,
      ).toBe(false);
    }
  });

  it("validates all 21 real handler successes and normalized errors", async () => {
    const signal = new AbortController().signal;
    for (const tool of tools) {
      const input = tool.inputSchema.parse(validInputs[tool.name]);
      const success = await tool.handler(input, signal);
      expect(tool.outputSchema.safeParse(success).success, tool.name).toBe(
        true,
      );

      const failure = errorResult(tool.name, {
        code: "INTERNAL_ERROR",
        message: "The operation could not be completed safely.",
        retryable: false,
      });
      expect(tool.outputSchema.safeParse(failure).success, tool.name).toBe(
        true,
      );
    }
  });

  it("requires normalized targets only for active network results", async () => {
    const signal = new AbortController().signal;
    const replay = tools.find((tool) => tool.name === "caido_replay_request")!;
    const createFinding = tools.find(
      (tool) => tool.name === "caido_create_finding",
    )!;
    const replaySuccess = await replay.handler(
      replay.inputSchema.parse(validInputs.caido_replay_request),
      signal,
    );
    const findingSuccess = await createFinding.handler(
      createFinding.inputSchema.parse(validInputs.caido_create_finding),
      signal,
    );
    const replayWithoutTarget = structuredClone(replaySuccess);
    delete (
      replayWithoutTarget.data as {
        evidence: { target?: unknown };
      }
    ).evidence.target;
    const findingWithTarget = structuredClone(findingSuccess);
    (
      findingWithTarget.data as {
        evidence: { target?: unknown };
      }
    ).evidence.target = {
      scheme: "https",
      host: "example.test",
      port: 443,
    };

    expect(replay.outputSchema.safeParse(replayWithoutTarget).success).toBe(
      false,
    );
    expect(
      createFinding.outputSchema.safeParse(findingWithTarget).success,
    ).toBe(false);
  });

  it("documents a complete executable JSON schema for every tool output", async () => {
    const generated = renderToolReference(tools);
    const signal = new AbortController().signal;

    for (const tool of tools) {
      const documented = outputSchemaFromSection(generated, tool.name);
      const documentedSchema = z.fromJSONSchema(documented);
      const input = tool.inputSchema.parse(validInputs[tool.name]);
      const success = await tool.handler(input, signal);
      const failure = errorResult(tool.name, {
        code: "INTERNAL_ERROR",
        message: "The operation could not be completed safely.",
        retryable: false,
      });

      expect(documentedSchema.safeParse(success).success, tool.name).toBe(true);
      expect(documentedSchema.safeParse(failure).success, tool.name).toBe(true);
      expect(
        documentedSchema.safeParse({
          ok: true,
          meta: { tool: tool.name },
          warnings: [],
        }).success,
        tool.name,
      ).toBe(false);
    }
  });
});
