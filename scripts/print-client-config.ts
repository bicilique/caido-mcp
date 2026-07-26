import { resolve } from "node:path";

import {
  SUPPORTED_CLIENTS,
  isSupportedClient,
  renderClientConfig,
} from "./onboarding/client-config.js";

const [client, ...unexpected] = process.argv.slice(2);

if (
  client === undefined ||
  unexpected.length > 0 ||
  !isSupportedClient(client)
) {
  console.error(
    `Usage: pnpm config:client <${SUPPORTED_CLIENTS.join("|")}>`,
  );
  process.exitCode = 1;
} else {
  const repositoryRoot = resolve(import.meta.dirname, "..");
  console.log(
    renderClientConfig(client, {
      nodePath: process.execPath,
      repositoryRoot,
      caidoUrl: process.env.CAIDO_URL ?? "http://127.0.0.1:8080",
    }),
  );
}
