import { createHash } from "node:crypto";

export interface BodyLimitOptions {
  offset: number;
  limit: number;
  hardLimit: number;
}

export interface BoundedBody {
  contentType: string;
  byteLength: number;
  offset: number;
  limit: number;
  truncated: boolean;
  sha256: string;
  text?: string;
}

const TEXT_LIKE_CONTENT = /^(?:text\/|application\/(?:json|.*\+json|xml|.*\+xml|javascript|x-www-form-urlencoded|graphql))/i;

export function boundBody(
  input: Uint8Array,
  contentType: string,
  options: BodyLimitOptions,
): BoundedBody {
  if (!Number.isInteger(options.offset) || options.offset < 0) {
    throw new Error("Body offset must be a non-negative integer.");
  }
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 0 ||
    options.limit > options.hardLimit
  ) {
    throw new Error("Body limit exceeds the configured hard limit.");
  }

  const end = Math.min(input.byteLength, options.offset + options.limit);
  const selected = input.slice(options.offset, end);
  const base: BoundedBody = {
    contentType,
    byteLength: input.byteLength,
    offset: options.offset,
    limit: options.limit,
    truncated: options.offset > 0 || end < input.byteLength,
    sha256: createHash("sha256").update(input).digest("hex"),
  };

  if (TEXT_LIKE_CONTENT.test(contentType)) {
    return {
      ...base,
      text: new TextDecoder("utf-8", { fatal: false }).decode(selected),
    };
  }
  return base;
}
