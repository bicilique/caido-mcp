import { join } from "node:path";

export const SUPPORTED_CLIENTS = ["codex", "claude", "cursor"] as const;

export type SupportedClient = (typeof SUPPORTED_CLIENTS)[number];

export interface ConfigContext {
  nodePath: string;
  repositoryRoot: string;
  caidoUrl: string;
}

function serverPath(context: ConfigContext): string {
  return join(
    context.repositoryRoot,
    "packages",
    "mcp-server",
    "dist",
    "cli.js",
  );
}

function jsonConfiguration(
  context: ConfigContext,
  credentialValue: string,
): string {
  return JSON.stringify(
    {
      mcpServers: {
        "caido-agent-kit": {
          command: context.nodePath,
          args: [serverPath(context)],
          env: {
            CAIDO_URL: context.caidoUrl,
            CAIDO_AGENT_MODE: "read-only",
            CAIDO_REQUIRE_SCOPE: "true",
            CAIDO_ALLOW_SENSITIVE_HEADERS: "false",
            CAIDO_PAT: credentialValue,
          },
        },
      },
    },
    undefined,
    2,
  );
}

export function renderClientConfig(
  client: SupportedClient,
  context: ConfigContext,
): string {
  if (client === "codex") {
    return `[mcp_servers.caido_agent_kit]
command = ${JSON.stringify(context.nodePath)}
args = [${JSON.stringify(serverPath(context))}]
env_vars = ["CAIDO_PAT"]
env = {
  CAIDO_URL = ${JSON.stringify(context.caidoUrl)},
  CAIDO_AGENT_MODE = "read-only",
  CAIDO_REQUIRE_SCOPE = "true",
  CAIDO_ALLOW_SENSITIVE_HEADERS = "false"
}`;
  }

  if (client === "claude") {
    return jsonConfiguration(context, "${CAIDO_PAT}");
  }

  return jsonConfiguration(context, "${env:CAIDO_PAT}");
}

export function isSupportedClient(value: string): value is SupportedClient {
  return SUPPORTED_CLIENTS.some((client) => client === value);
}
