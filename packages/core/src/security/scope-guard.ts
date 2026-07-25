import { isIP } from "node:net";
import { domainToASCII } from "node:url";

export interface NormalizedTarget {
  url: string;
  scheme: "http" | "https";
  host: string;
  port: number;
}

export interface ScopeRule {
  action: "allow" | "deny";
  host: string;
  scheme?: "http" | "https";
  port?: number;
}

export interface ScopeDecision {
  allowed: boolean;
  reason: "matched_allow" | "matched_deny" | "no_matching_allow" | "no_selected_scope";
  matchedRule?: ScopeRule;
}

function normalizeHost(host: string): string {
  const unwrapped = host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
  const withoutTrailingDot = unwrapped.replace(/\.+$/, "").toLowerCase();
  if (isIP(withoutTrailingDot) !== 0) {
    return withoutTrailingDot;
  }
  const ascii = domainToASCII(withoutTrailingDot);
  if (ascii.length === 0 || ascii.includes("..")) {
    throw new Error("Invalid target host.");
  }
  return ascii;
}

export function normalizeTarget(input: string): NormalizedTarget {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid target URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid target protocol; expected HTTP or HTTPS.");
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error("Invalid target URL; embedded credentials are not allowed.");
  }

  const scheme = parsed.protocol.slice(0, -1) as "http" | "https";
  const host = normalizeHost(parsed.hostname);
  const port = parsed.port === ""
    ? scheme === "https"
      ? 443
      : 80
    : Number(parsed.port);

  if (isIP(host) === 0) {
    parsed.hostname = host;
  }

  return {
    url: parsed.toString(),
    scheme,
    host,
    port,
  };
}

function hostMatches(targetHost: string, ruleHost: string): boolean {
  if (ruleHost.startsWith("*.")) {
    const suffix = normalizeHost(ruleHost.slice(2));
    return targetHost.endsWith(`.${suffix}`) && targetHost !== suffix;
  }
  return targetHost === normalizeHost(ruleHost);
}

function ruleMatches(target: NormalizedTarget, rule: ScopeRule): boolean {
  return (
    hostMatches(target.host, rule.host) &&
    (rule.scheme === undefined || rule.scheme === target.scheme) &&
    (rule.port === undefined || rule.port === target.port)
  );
}

export function evaluateScope(
  target: NormalizedTarget,
  rules: readonly ScopeRule[],
): ScopeDecision {
  if (rules.length === 0) {
    return { allowed: false, reason: "no_selected_scope" };
  }

  const deny = rules.find(
    (rule) => rule.action === "deny" && ruleMatches(target, rule),
  );
  if (deny !== undefined) {
    return { allowed: false, reason: "matched_deny", matchedRule: deny };
  }

  const allow = rules.find(
    (rule) => rule.action === "allow" && ruleMatches(target, rule),
  );
  if (allow !== undefined) {
    return { allowed: true, reason: "matched_allow", matchedRule: allow };
  }
  return { allowed: false, reason: "no_matching_allow" };
}
