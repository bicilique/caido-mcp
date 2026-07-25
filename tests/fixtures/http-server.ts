import { createServer } from "node:http";
import { isIP } from "node:net";

export interface HttpFixture {
  url: string;
  close(): Promise<void>;
}

interface Closeable {
  close(): Promise<void>;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized === "::1") {
    return true;
  }
  if (isIP(normalized) === 4) {
    const octets = normalized.split(".");
    return octets[0] === "127";
  }
  return false;
}

export function assertLoopbackTarget(input: string): URL {
  const target = new URL(input);
  if (
    (target.protocol !== "http:" && target.protocol !== "https:") ||
    !isLoopbackHost(target.hostname)
  ) {
    throw new Error("The E2E fixture target must be an HTTP(S) loopback URL.");
  }
  return target;
}

export async function closeE2eResources(
  runtime: Closeable | undefined,
  fixture: Closeable | undefined,
): Promise<void> {
  const close = async (resource: Closeable | undefined): Promise<void> => {
    await resource?.close();
  };
  const results = await Promise.allSettled([
    close(runtime),
    close(fixture),
  ]);
  const failed = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failed !== undefined) {
    throw failed.reason;
  }
}

export async function startHttpFixture(): Promise<HttpFixture> {
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    response.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(
      JSON.stringify({
        ok: true,
        method: request.method,
        path: request.url,
        bodyLength: Buffer.concat(chunks).byteLength,
      }),
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The localhost fixture did not bind a TCP port.");
  }
  const url = `http://127.0.0.1:${address.port}/e2e`;
  assertLoopbackTarget(url);

  let closing: Promise<void> | undefined;
  return {
    url,
    close: () => {
      closing ??= new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
        server.closeAllConnections();
      });
      return closing;
    },
  };
}
