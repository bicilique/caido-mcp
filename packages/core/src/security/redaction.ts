export type Header = readonly [name: string, value: string];

const REDACTED = "[REDACTED]";
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
  "x-xsrf-token",
]);
const SENSITIVE_FIELDS = new Set([
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "apikey",
  "xapikey",
  "authtoken",
  "xauthtoken",
  "accesstoken",
  "refreshtoken",
  "csrftoken",
  "xcsrftoken",
  "xsrftoken",
  "xxsrftoken",
  "password",
  "session",
  "sessionid",
]);

function canonicalName(name: string): string {
  return name.trim().toLowerCase();
}

function canonicalField(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function isSensitiveHeader(name: string): boolean {
  const canonical = canonicalName(name);
  return (
    SENSITIVE_HEADERS.has(canonical) ||
    canonical.endsWith("-api-key") ||
    canonical.endsWith("-auth-token")
  );
}

function isSensitiveField(name: string): boolean {
  const canonical = canonicalField(name);
  return (
    SENSITIVE_FIELDS.has(canonical) ||
    canonical.endsWith("apikey") ||
    canonical.endsWith("authtoken") ||
    canonical.endsWith("accesstoken") ||
    canonical.endsWith("refreshtoken")
  );
}

export function redactHeaders(headers: readonly Header[]): [string, string][] {
  return headers.map(([name, value]) => [
    name,
    isSensitiveHeader(name) ? REDACTED : value,
  ]);
}

export function redactStructured(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactStructured(entry));
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveField(key) ? REDACTED : redactStructured(entry),
    ]),
  );
}

export function redactUrl(value: string): string {
  const url = new URL(value);
  for (const name of [...url.searchParams.keys()]) {
    if (isSensitiveField(name)) {
      url.searchParams.set(name, REDACTED);
    }
  }
  return url.toString();
}

export function redactRawHttp(raw: string): string {
  const lines = raw.split("\r\n");
  let previousHeaderWasSensitive = false;

  return lines
    .map((line, index) => {
      if (index === 0 || line.length === 0) {
        previousHeaderWasSensitive = false;
        return line;
      }
      if (/^[ \t]/.test(line)) {
        return previousHeaderWasSensitive
          ? `${line[0] ?? " "}${REDACTED}`
          : line;
      }
      const separator = line.indexOf(":");
      if (separator < 1) {
        previousHeaderWasSensitive = false;
        return line;
      }
      const name = line.slice(0, separator);
      previousHeaderWasSensitive = isSensitiveHeader(name);
      return previousHeaderWasSensitive ? `${name}: ${REDACTED}` : line;
    })
    .join("\r\n");
}
