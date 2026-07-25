import { createHash } from "node:crypto";

import type { Header } from "./redaction.js";

export interface FingerprintInput {
  statusCode: number;
  headers: readonly Header[];
  body: Uint8Array;
}

export function fingerprintResponse(input: FingerprintInput): string {
  const canonicalHeaders = input.headers
    .map(([name, value]) => [name.trim().toLowerCase(), value.trim()] as const)
    .sort(([leftName, leftValue], [rightName, rightValue]) =>
      `${leftName}:${leftValue}`.localeCompare(`${rightName}:${rightValue}`),
    );

  const hash = createHash("sha256");
  hash.update(`${input.statusCode}\n`);
  for (const [name, value] of canonicalHeaders) {
    hash.update(`${name}:${value}\n`);
  }
  hash.update("\n");
  hash.update(input.body);
  return hash.digest("hex");
}
