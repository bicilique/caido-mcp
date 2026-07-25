import type { Header } from "../security/redaction.js";
import type { ScopeRule } from "../security/scope-guard.js";

export interface Page<T> {
  items: readonly T[];
  nextCursor?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  selected: boolean;
}

export interface RequestSummary {
  id: string;
  method: string;
  host: string;
  path: string;
  scheme: "http" | "https";
  port: number;
  statusCode?: number;
  requestLength?: number;
  responseLength?: number;
  createdAt: string;
}

export interface RawMessage {
  headers: readonly Header[];
  body: Uint8Array;
  contentType: string;
}

export interface RequestDetail extends RequestSummary {
  request: RawMessage;
  response?: RawMessage;
}

export interface ScopeSummary {
  id: string;
  name: string;
  rules: readonly ScopeRule[];
  selected: boolean;
}

export interface SitemapNode {
  id: string;
  label: string;
  kind: "host" | "path";
  children: readonly SitemapNode[];
}

export interface FindingSummary {
  id: string;
  title: string;
  severity: string;
  requestIds: readonly string[];
}

export interface FindingDetail extends FindingSummary {
  description: string;
  evidence: string;
}

export interface CreateFindingInput {
  title: string;
  description: string;
  requestId: string;
}

export interface ReplaySessionSummary {
  id: string;
  name: string;
  entryIds: readonly string[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  enabled: boolean;
}

export interface FilterSummary {
  id: string;
  name: string;
  query: string;
}

export interface RequestListInput {
  httpql?: string;
  cursor?: string;
  direction: "ascending" | "descending";
  limit: number;
}

export interface ListInput {
  cursor?: string;
  limit: number;
}

export interface RawRequestInput {
  method: string;
  url: string;
  headers: readonly Header[];
  body?: Uint8Array;
}

export interface MutationEvidence {
  projectId?: string;
  requestIds: readonly string[];
  mutation: string;
}

export interface CaidoAdapter {
  health(): Promise<{
    reachable: boolean;
    authenticated: boolean;
    version?: string;
    currentProject?: ProjectSummary;
  }>;
  getCurrentProject(): Promise<ProjectSummary | undefined>;
  listProjects(input: ListInput): Promise<Page<ProjectSummary>>;
  listRequests(input: RequestListInput): Promise<Page<RequestSummary>>;
  getRequests(ids: readonly string[]): Promise<readonly RequestDetail[]>;
  listSitemap(depth: number, limit: number): Promise<readonly SitemapNode[]>;
  listScopes(): Promise<readonly ScopeSummary[]>;
  listFindings(input: ListInput): Promise<Page<FindingSummary>>;
  getFinding(id: string): Promise<FindingDetail | undefined>;
  listReplaySessions(input: ListInput): Promise<Page<ReplaySessionSummary>>;
  listWorkflows(input: ListInput): Promise<Page<WorkflowSummary>>;
  listFilters(input: ListInput): Promise<Page<FilterSummary>>;
  selectProject(id: string): Promise<MutationEvidence>;
  replayRequest(requestId: string, raw: RawMessage): Promise<MutationEvidence>;
  sendRawRequest(input: RawRequestInput): Promise<MutationEvidence>;
  createFinding(input: CreateFindingInput): Promise<MutationEvidence>;
  updateFinding(
    id: string,
    input: Partial<Omit<FindingDetail, "id">>,
  ): Promise<MutationEvidence>;
  setIntercept(enabled: boolean): Promise<MutationEvidence>;
  runWorkflow(id: string): Promise<MutationEvidence>;
  close(): Promise<void>;
}
