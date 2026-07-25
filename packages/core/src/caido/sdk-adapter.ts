import type {
  FilterPreset,
  Finding,
  Health,
  Project,
  RequestResponseOpt,
  Scope,
  Workflow,
} from "@caido/sdk-client";

import { AgentError } from "../errors.js";
import type {
  CaidoAdapter,
  CreateFindingInput,
  FindingDetail,
  ListInput,
  MutationEvidence,
  Page,
  RawMessage,
  RawRequestInput,
  ReplaySessionSummary,
  RequestListInput,
} from "./adapter.js";
import {
  mapConnection,
  mapFilter,
  mapFindingDetail,
  mapFindingSummary,
  mapProject,
  mapReplaySession,
  mapRequestDetail,
  mapRequestListSummary,
  mapRequestSummary,
  mapScope,
  mapWorkflow,
  paginate,
  sdkHealthSchema,
} from "./mappers.js";

interface SdkConnection<T> {
  readonly edges: readonly { readonly cursor: string; readonly node: T }[];
  readonly pageInfo: {
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly startCursor?: string;
    readonly endCursor?: string;
  };
}

interface SdkListBuilder<T> {
  first(limit: number): this;
  after(cursor: string): this;
  execute(): Promise<SdkConnection<T>>;
}

interface SdkRequestListBuilder extends SdkListBuilder<RequestResponseOpt> {
  filter(query: string): this;
  ascending(target: "req", field: "created_at"): this;
  descending(target: "req", field: "created_at"): this;
  includeRaw(value: { request: boolean; response: boolean }): this;
}

interface SdkReplayEntry {
  readonly id: string;
}

interface SdkReplaySession {
  readonly id: string;
  readonly name: string;
  readonly collectionId: string;
  readonly activeEntryId?: string;
  entries(): SdkListBuilder<SdkReplayEntry>;
}

export interface CaidoSdkClient {
  health(): Promise<Health>;
  readonly project: {
    list(): Promise<Project[]>;
    select(id: string): Promise<Project>;
  };
  readonly request: {
    list(): SdkRequestListBuilder;
    get(
      id: string,
      options?: { requestRaw?: boolean; responseRaw?: boolean },
    ): Promise<RequestResponseOpt | undefined>;
  };
  readonly scope: { list(): Promise<Scope[]> };
  readonly finding: {
    list(): SdkListBuilder<Finding>;
    get(id: string): Promise<Finding | undefined>;
    create(
      requestId: string,
      options: {
        title: string;
        reporter: string;
        description?: string;
        dedupeKey?: string;
      },
    ): Promise<Finding>;
    update(
      id: string,
      options: { title: string; description: string; hidden: boolean },
    ): Promise<Finding>;
  };
  readonly replay: {
    readonly sessions: {
      list(): SdkListBuilder<SdkReplaySession>;
      create(options?: {
        requestSource?:
          | { id: string }
          | {
              raw: string;
              connection: {
                host: string;
                port: number;
                isTLS: boolean;
                SNI: string | undefined;
              };
            };
      }): Promise<{ readonly id: string }>;
    };
    send(
      sessionId: string,
      options: {
        raw: string | Uint8Array;
        connection: {
          host: string;
          port: number;
          isTLS: boolean;
          SNI: string | undefined;
        };
      },
    ): Promise<{
      readonly entry: {
        readonly id: string;
        readonly request?: { readonly id: string };
      };
      readonly status: "DONE" | "CANCELLED" | "ERROR";
      readonly error?: { readonly code: string };
    }>;
  };
  readonly workflow: { list(): Promise<Workflow[]> };
  readonly filter: { list(): Promise<FilterPreset[]> };
  close?(): Promise<void>;
  disconnect?(): Promise<void>;
}

export interface SdkCaidoAdapterOptions {
  initializationError?: AgentError;
  initializationState?: CaidoInitializationState;
  closeClient?: () => Promise<void>;
}

export interface CaidoInitializationState {
  initializationError?: AgentError;
}

function unavailable(capability: string): AgentError {
  return new AgentError(
    "TOOL_DISABLED",
    `${capability} is unavailable through the installed Caido SDK.`,
    false,
    "Use a supported Caido SDK operation or upgrade when the capability is exposed.",
  );
}

function findingDescription(description: string, evidence: string): string {
  return evidence === "" ? description : `${description}\n\nEvidence:\n${evidence}`;
}

function serializeRequest(
  method: string,
  path: string,
  headers: RawMessage["headers"],
  body: Uint8Array,
): Uint8Array {
  const head = `${method} ${path} HTTP/1.1\r\n${headers
    .map(([name, value]) => `${name}: ${value}`)
    .join("\r\n")}\r\n\r\n`;
  return new Uint8Array(
    Buffer.concat([Buffer.from(head, "latin1"), Buffer.from(body)]),
  );
}

export class SdkCaidoAdapter implements CaidoAdapter {
  readonly #client: CaidoSdkClient;
  readonly #initializationError: AgentError | undefined;
  readonly #initializationState: CaidoInitializationState | undefined;
  readonly #closeClient: (() => Promise<void>) | undefined;
  #selectedProject: Project | undefined;
  #closed = false;

  constructor(client: CaidoSdkClient, options: SdkCaidoAdapterOptions = {}) {
    this.#client = client;
    this.#initializationError = options.initializationError;
    this.#initializationState = options.initializationState;
    this.#closeClient = options.closeClient;
  }

  #connectionError(): AgentError | undefined {
    return (
      this.#initializationState?.initializationError ??
      this.#initializationError
    );
  }

  #ready(): void {
    if (this.#closed) {
      throw new AgentError(
        "UPSTREAM_ERROR",
        "The Caido adapter is closed.",
        false,
      );
    }
    const connectionError = this.#connectionError();
    if (connectionError !== undefined) {
      throw connectionError;
    }
  }

  async health(): ReturnType<CaidoAdapter["health"]> {
    if (this.#connectionError() !== undefined || this.#closed) {
      return { reachable: false, authenticated: false };
    }
    try {
      const health = sdkHealthSchema.parse(await this.#client.health());
      return {
        reachable: true,
        authenticated: true,
        version: health.version,
        ...(this.#selectedProject === undefined
          ? {}
          : {
              currentProject: mapProject(
                this.#selectedProject,
                this.#selectedProject.id,
              ),
            }),
      };
    } catch {
      return { reachable: false, authenticated: false };
    }
  }

  async getCurrentProject() {
    this.#ready();
    return this.#selectedProject === undefined
      ? undefined
      : mapProject(this.#selectedProject, this.#selectedProject.id);
  }

  async listProjects(input: ListInput) {
    this.#ready();
    const projects = (await this.#client.project.list()).map((project) =>
      mapProject(project, this.#selectedProject?.id),
    );
    return paginate(projects, input.limit, input.cursor);
  }

  async listRequests(input: RequestListInput) {
    this.#ready();
    const builder = this.#client.request
      .list()
      .includeRaw({ request: false, response: false });
    if (input.httpql !== undefined) builder.filter(input.httpql);
    if (input.cursor !== undefined) builder.after(input.cursor);
    builder[input.direction === "ascending" ? "ascending" : "descending"](
      "req",
      "created_at",
    );
    const page = await builder.first(input.limit).execute();
    return mapConnection(page, mapRequestListSummary);
  }

  async getRequests(ids: readonly string[]) {
    this.#ready();
    const requests = await Promise.all(
      ids.map((id) =>
        this.#client.request.get(id, {
          requestRaw: true,
          responseRaw: true,
        }),
      ),
    );
    return requests.flatMap((request) =>
      request === undefined ? [] : [mapRequestDetail(request)],
    );
  }

  async listSitemap(): Promise<never> {
    throw unavailable("Sitemap listing");
  }

  async listScopes() {
    this.#ready();
    return (await this.#client.scope.list()).map(mapScope);
  }

  async listFindings(input: ListInput) {
    this.#ready();
    const builder = this.#client.finding.list();
    if (input.cursor !== undefined) builder.after(input.cursor);
    return mapConnection(
      await builder.first(input.limit).execute(),
      mapFindingSummary,
    );
  }

  async getFinding(id: string) {
    this.#ready();
    const finding = await this.#client.finding.get(id);
    return finding === undefined ? undefined : mapFindingDetail(finding);
  }

  async listReplaySessions(
    input: ListInput,
  ): Promise<Page<ReplaySessionSummary>> {
    this.#ready();
    const builder = this.#client.replay.sessions.list();
    if (input.cursor !== undefined) builder.after(input.cursor);
    const page = await builder.first(input.limit).execute();
    const items = await Promise.all(
      page.edges.map(async ({ node }) => {
        const entries = await node.entries().first(100).execute();
        return mapReplaySession(
          node,
          entries.edges.map(({ node: entry }) => entry.id),
        );
      }),
    );
    return {
      items,
      ...(page.pageInfo.hasNextPage && page.pageInfo.endCursor !== undefined
        ? { nextCursor: page.pageInfo.endCursor }
        : {}),
    };
  }

  async listWorkflows(input: ListInput) {
    this.#ready();
    return paginate(
      (await this.#client.workflow.list()).map(mapWorkflow),
      input.limit,
      input.cursor,
    );
  }

  async listFilters(input: ListInput) {
    this.#ready();
    return paginate(
      (await this.#client.filter.list()).map(mapFilter),
      input.limit,
      input.cursor,
    );
  }

  async selectProject(id: string): Promise<MutationEvidence> {
    this.#ready();
    this.#selectedProject = await this.#client.project.select(id);
    return { projectId: id, requestIds: [], mutation: "select_project" };
  }

  async replayRequest(
    requestId: string,
    raw: RawMessage,
  ): Promise<MutationEvidence> {
    this.#ready();
    const pair = await this.#client.request.get(requestId, {
      requestRaw: false,
      responseRaw: false,
    });
    if (pair === undefined) {
      throw new AgentError(
        "NOT_FOUND",
        "The requested Caido request does not exist.",
        false,
      );
    }
    const request = mapRequestSummary(pair);
    const path = request.path;
    const bytes = serializeRequest(request.method, path, raw.headers, raw.body);
    const connection = {
      host: request.host,
      port: request.port,
      isTLS: request.scheme === "https",
      SNI: request.host,
    };
    const session = await this.#client.replay.sessions.create({
      requestSource: { id: requestId },
    });
    const result = await this.#client.replay.send(session.id, {
      raw: bytes,
      connection,
    });
    if (result.status !== "DONE") {
      throw new AgentError(
        "UPSTREAM_ERROR",
        "Caido Replay did not complete successfully.",
        result.status !== "CANCELLED",
      );
    }
    return {
      requestIds: [
        requestId,
        ...(result.entry.request === undefined
          ? []
          : [result.entry.request.id]),
      ],
      mutation: "replay_request",
    };
  }

  async sendRawRequest(input: RawRequestInput): Promise<MutationEvidence> {
    this.#ready();
    let url: URL;
    try {
      url = new URL(input.url);
    } catch {
      throw new AgentError("INVALID_INPUT", "The request URL is invalid.", false);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new AgentError(
        "INVALID_INPUT",
        "The request URL must use HTTP or HTTPS.",
        false,
      );
    }
    const port =
      url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
    const headers = input.headers.some(
      ([name]) => name.toLowerCase() === "host",
    )
      ? input.headers
      : ([["Host", url.host], ...input.headers] as const);
    const bytes = serializeRequest(
      input.method,
      `${url.pathname}${url.search}`,
      headers,
      input.body ?? new Uint8Array(),
    );
    const connection = {
      host: url.hostname,
      port,
      isTLS: url.protocol === "https:",
      SNI: url.hostname,
    };
    const session = await this.#client.replay.sessions.create({
      requestSource: {
        raw: Buffer.from(bytes).toString("latin1"),
        connection,
      },
    });
    const result = await this.#client.replay.send(session.id, {
      raw: bytes,
      connection,
    });
    if (result.status !== "DONE") {
      throw new AgentError(
        "UPSTREAM_ERROR",
        "Caido Replay did not complete successfully.",
        result.status !== "CANCELLED",
      );
    }
    return {
      requestIds:
        result.entry.request === undefined ? [] : [result.entry.request.id],
      mutation: "send_raw_request",
    };
  }

  async createFinding(
    input: CreateFindingInput,
  ): Promise<MutationEvidence> {
    this.#ready();
    const supportedFields = new Set(["title", "description", "requestId"]);
    if (Object.keys(input).some((field) => !supportedFields.has(field))) {
      throw unavailable("Unsupported finding creation fields");
    }
    if (
      typeof input.title !== "string" ||
      input.title.trim() === "" ||
      typeof input.description !== "string" ||
      typeof input.requestId !== "string" ||
      input.requestId.trim() === ""
    ) {
      throw new AgentError(
        "INVALID_INPUT",
        "A title, description, and request ID are required to create a Caido finding.",
        false,
      );
    }
    const finding = await this.#client.finding.create(input.requestId, {
      title: input.title,
      reporter: "caido-agent-kit",
      description: input.description,
    });
    return {
      requestIds: [finding.requestId],
      mutation: "create_finding",
    };
  }

  async updateFinding(
    id: string,
    input: Partial<Omit<FindingDetail, "id">>,
  ): Promise<MutationEvidence> {
    this.#ready();
    const providedFields: object = input;
    if (
      "severity" in providedFields ||
      "requestIds" in providedFields
    ) {
      throw unavailable("Finding severity or request association updates");
    }
    const current = await this.#client.finding.get(id);
    if (current === undefined) {
      throw new AgentError(
        "NOT_FOUND",
        "The requested Caido finding does not exist.",
        false,
      );
    }
    const description =
      input.evidence === undefined
        ? (input.description ?? current.description ?? "")
        : findingDescription(
            input.description ?? current.description ?? "",
            input.evidence,
          );
    const finding = await this.#client.finding.update(id, {
      title: input.title ?? current.title,
      description,
      hidden: current.hidden,
    });
    return {
      requestIds: [finding.requestId],
      mutation: "update_finding",
    };
  }

  async setIntercept(_enabled: boolean): Promise<never> {
    throw unavailable("Intercept control");
  }

  async runWorkflow(_id: string): Promise<never> {
    throw unavailable("Workflow execution without required SDK input");
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#closeClient !== undefined) {
      await this.#closeClient();
    } else if (this.#client.close !== undefined) {
      await this.#client.close();
    } else if (this.#client.disconnect !== undefined) {
      await this.#client.disconnect();
    }
  }
}
