import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";

export interface MockCaidoOptions {
  requiredToken?: string;
  refreshToken?: string;
  scopeAllowlist?: string[];
  replay?: "success" | "timeout" | "upstream-error";
}

export interface MockCaidoServer {
  url: string;
  operations(name: string): readonly GraphQLCall[];
  close(): Promise<void>;
}

interface GraphQLCall {
  operationName: string;
  variables: Record<string, unknown>;
}

const timestamp = "2026-07-25T00:00:00.000Z";

function project(id: string) {
  return {
    id,
    name: id === "project-2" ? "Secondary" : "Assessment",
    path: `/tmp/${id}`,
    status: "READY",
    temporary: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: "0.57.1",
    size: 10,
    readOnly: false,
  };
}

function requestNode(
  id: "request-text" | "request-binary",
  includeRaw: boolean,
) {
  const responseText = `{"access_token":"integration-secret","padding":"${"R".repeat(9_000)}"}`;
  const binaryResponse = new Uint8Array([
    ...new TextEncoder().encode(
      "HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\n\r\n",
    ),
    ...new Uint8Array(9_000).fill(7),
    ...new TextEncoder().encode("binary-response-secret"),
  ]);
  const textRaw = [
    "GET /account?token=integration-secret HTTP/1.1",
    "Host: 127.0.0.1",
    "Authorization: Bearer integration-secret",
    "Content-Type: application/json",
    "",
    `{"token":"integration-secret","safe":"evidence","padding":"${"A".repeat(9_000)}"}`,
  ].join("\r\n");
  const binaryRaw = new Uint8Array([
    ...new TextEncoder().encode(
      "POST /upload HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/octet-stream\r\n\r\n",
    ),
    0,
    1,
    2,
    ...new TextEncoder().encode("binary-secret"),
  ]);
  return {
    id,
    host: "127.0.0.1",
    port: 18080,
    method: id === "request-text" ? "GET" : "POST",
    path: id === "request-text" ? "/account?token=integration-secret" : "/upload",
    query: id === "request-text" ? "token=integration-secret" : "",
    isTls: false,
    metadata: { id: `metadata-${id}`, color: null },
    createdAt: timestamp,
    ...(includeRaw
      ? {
          raw: Buffer.from(
            id === "request-text" ? textRaw : binaryRaw,
          ).toString("base64"),
        }
      : {}),
    response: {
      id: `response-${id}`,
      statusCode: 200,
      roundtripTime: 12,
      length: id === "request-text" ? 128 : 50_000,
      createdAt: timestamp,
      ...(includeRaw
        ? {
            raw: Buffer.from(
              id === "request-text"
                ? `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n${responseText}`
                : binaryResponse,
            ).toString("base64"),
          }
        : {}),
    },
  };
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
    string,
    unknown
  >;
}

export async function createMockCaidoServer(
  options: MockCaidoOptions = {},
): Promise<MockCaidoServer> {
  const calls: GraphQLCall[] = [];
  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, {
        name: "caido",
        version: "0.57.1",
        ready: true,
      });
      return;
    }
    if (request.method !== "POST" || request.url !== "/graphql") {
      sendJson(response, 404, { error: "not found" });
      return;
    }
    const payload = await readJson(request);
    const operationName =
      typeof payload.operationName === "string" ? payload.operationName : "";
    const variables =
      typeof payload.variables === "object" && payload.variables !== null
        ? (payload.variables as Record<string, unknown>)
        : {};
    calls.push({ operationName, variables });

    if (operationName === "RefreshAuthenticationToken") {
      if (
        options.refreshToken === undefined ||
        variables.refreshToken !== options.refreshToken
      ) {
        sendJson(response, 200, {
          data: {
            refreshAuthenticationToken: {
              token: null,
              error: {
                __typename: "AuthenticationUserError",
                code: "AUTHENTICATION",
                reason: "INVALID_REFRESH_TOKEN",
              },
            },
          },
        });
      } else {
        sendJson(response, 200, {
          data: {
            refreshAuthenticationToken: {
              token: {
                accessToken: options.requiredToken ?? "integration-token",
                refreshToken: options.refreshToken,
                expiresAt: "2026-07-25T01:00:00.000Z",
                scopes: [],
              },
              error: null,
            },
          },
        });
      }
      return;
    }

    if (
      request.headers.authorization !==
      `Bearer ${options.requiredToken ?? "integration-token"}`
    ) {
      if (options.refreshToken !== undefined) {
        sendJson(response, 200, {
          errors: [
            {
              message: "authorization failed",
              extensions: {
                CAIDO: {
                  code: "AUTHORIZATION",
                  reason: "INVALID_TOKEN",
                },
              },
            },
          ],
        });
      } else {
        sendJson(response, 401, { error: "authentication failed" });
      }
      return;
    }

    if (operationName === "Projects") {
      sendJson(response, 200, { data: { projects: [project("project-1"), project("project-2")] } });
      return;
    }
    if (operationName === "SelectProject") {
      if (variables.id === "missing-project") {
        sendJson(response, 200, {
          data: {
            selectProject: {
              currentProject: null,
              error: {
                __typename: "UnknownIdUserError",
                id: "missing-project",
                code: "UNKNOWN_ID",
              },
            },
          },
        });
      } else {
        sendJson(response, 200, {
          data: {
            selectProject: {
              currentProject: { project: project(String(variables.id)) },
              error: null,
            },
          },
        });
      }
      return;
    }
    if (operationName === "Scopes") {
      sendJson(response, 200, {
        data: {
          scopes: [
            {
              id: "scope-1",
              name: "Integration scope",
              allowlist: options.scopeAllowlist ?? ["127.0.0.1"],
              denylist: [],
              indexed: true,
            },
          ],
        },
      });
      return;
    }
    if (operationName === "Requests") {
      const filter = (variables.filter as { code?: string } | undefined)?.code;
      if (filter === "INVALID_HTTPQL") {
        sendJson(response, 200, {
          errors: [{ message: "invalid HTTPQL integration-secret" }],
        });
        return;
      }
      if (filter === "UPSTREAM_ERROR") {
        sendJson(response, 500, { error: "upstream integration-secret" });
        return;
      }
      const malformed = filter === "MALFORMED_DATA";
      const all = [
        requestNode("request-text", false),
        requestNode("request-binary", false),
      ];
      const after = typeof variables.after === "string" ? variables.after : undefined;
      const start = after === undefined ? 0 : 1;
      const limit = typeof variables.first === "number" ? variables.first : 20;
      const nodes = all.slice(start, start + limit);
      sendJson(response, 200, {
        data: {
          requests: {
            edges: nodes.map((node) => ({
              cursor: `cursor-${node.id}`,
              node: malformed ? { id: 42 } : node,
            })),
            pageInfo: {
              hasNextPage: start + nodes.length < all.length,
              hasPreviousPage: start > 0,
              startCursor:
                nodes.length === 0 ? null : `cursor-${nodes[0]!.id}`,
              endCursor:
                nodes.length === 0
                  ? null
                  : `cursor-${nodes[nodes.length - 1]!.id}`,
            },
          },
        },
      });
      return;
    }
    if (operationName === "Request") {
      const id = String(variables.id);
      const node =
        id === "request-text" || id === "request-binary"
          ? requestNode(id, true)
          : null;
      sendJson(response, 200, { data: { request: node } });
      return;
    }
    if (operationName.includes("CreateReplaySession")) {
      if (options.replay === "upstream-error") {
        sendJson(response, 500, { error: "Replay integration-secret" });
        return;
      }
      if (options.replay === "timeout") {
        return;
      }
      sendJson(response, 200, {
        data: {
          createReplaySession: {
            error: null,
            session: {
              __typename: "ReplaySessionHttp",
              id: "replay-session-1",
              name: "Integration Replay",
              collection: { id: "collection-1" },
              activeEntry: { id: "entry-draft" },
              entries: { edges: [{ node: { id: "entry-draft" } }] },
              settings: {
                connectionClose: false,
                updateContentLength: true,
              },
            },
          },
        },
      });
      return;
    }
    if (operationName === "ReplaySession") {
      sendJson(response, 200, {
        data: {
          replaySession: {
            __typename: "ReplaySessionHttp",
            id: "replay-session-1",
            name: "Integration Replay",
            collection: { id: "collection-1" },
            activeEntry: { id: "entry-draft" },
            entries: { edges: [{ node: { id: "entry-draft" } }] },
            settings: {
              connectionClose: false,
              updateContentLength: true,
            },
          },
        },
      });
      return;
    }
    if (operationName === "UpdateReplayEntryDraft") {
      sendJson(response, 200, {
        data: { updateReplayEntryDraft: { entry: { id: "entry-draft" } } },
      });
      return;
    }
    if (operationName === "StartReplayTask") {
      sendJson(response, 200, {
        data: {
          startReplayTask: {
            error: null,
            task: {
              __typename: "ReplayTask",
              id: "replay-task-1",
              createdAt: timestamp,
              replayEntry: { id: "entry-finished" },
            },
          },
        },
      });
      return;
    }
    if (operationName === "ReplayEntry") {
      sendJson(response, 200, {
        data: {
          replayEntry: {
            __typename: "ReplayEntryHttp",
            id: "entry-finished",
            createdAt: timestamp,
            error: null,
            raw: Buffer.from(
              "GET /success HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
            ).toString("base64"),
            connection: {
              __typename: "ConnectionInfo",
              host: "127.0.0.1",
              port: 18080,
              isTLS: false,
              SNI: "127.0.0.1",
            },
            request: {
              ...requestNode("request-text", false),
              id: "request-replayed",
              path: "/success",
              query: "",
            },
            session: { id: "replay-session-1" },
            settings: { placeholders: [] },
          },
        },
      });
      return;
    }

    sendJson(response, 500, {
      error: `unsupported mock operation ${operationName} integration-secret`,
    });
  });
  const webSockets = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/ws/graphql") {
      socket.destroy();
      return;
    }
    webSockets.handleUpgrade(request, socket, head, (webSocket) => {
      webSockets.emit("connection", webSocket, request);
    });
  });
  webSockets.on("connection", (webSocket) => {
    webSocket.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as {
        id?: string;
        type: string;
      };
      if (message.type === "connection_init") {
        webSocket.send(JSON.stringify({ type: "connection_ack" }));
        return;
      }
      if (message.type === "ping") {
        webSocket.send(JSON.stringify({ type: "pong" }));
        return;
      }
      if (message.type === "subscribe" && message.id !== undefined) {
        webSocket.send(
          JSON.stringify({
            id: message.id,
            type: "next",
            payload: {
              data: {
                finishedTask: {
                  task: {
                    __typename: "ReplayTask",
                    id: "replay-task-1",
                    createdAt: timestamp,
                    replayEntry: { id: "entry-finished" },
                  },
                  status: "DONE",
                  error: null,
                },
              },
            },
          }),
        );
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Mock Caido server did not bind a TCP port.");
  }

  let closing: Promise<void> | undefined;
  return {
    url: `http://127.0.0.1:${address.port}`,
    operations: (name) => calls.filter((call) => call.operationName === name),
    close: () => {
      closing ??= new Promise<void>((resolve, reject) => {
        for (const client of webSockets.clients) client.terminate();
        webSockets.close();
        server.close((error) => (error === undefined ? resolve() : reject(error)));
        server.closeAllConnections();
      });
      return closing;
    },
  };
}
