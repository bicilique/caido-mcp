import { describe, expect, it } from "vitest";

import {
  evaluateScope,
  normalizeTarget,
  type ScopeRule,
} from "../../src/security/scope-guard.js";

const allow = (
  host: string,
  overrides: Partial<ScopeRule> = {},
): ScopeRule => ({
  action: "allow",
  host,
  ...overrides,
});

describe("normalizeTarget", () => {
  it("normalizes host case, trailing dots, default port, and Unicode", () => {
    expect(normalizeTarget("HTTPS://BÜCHER.Example.:443/path")).toEqual({
      url: "https://xn--bcher-kva.example/path",
      scheme: "https",
      host: "xn--bcher-kva.example",
      port: 443,
    });
  });

  it("normalizes bracketed IPv6 destinations", () => {
    expect(normalizeTarget("http://[::1]:8080/")).toEqual({
      url: "http://[::1]:8080/",
      scheme: "http",
      host: "::1",
      port: 8080,
    });
  });

  it.each([
    "not a URL",
    "file:///tmp/request",
    "https://xn--invalid-.example/",
  ])("rejects malformed or unsupported target %s", (target) => {
    expect(() => normalizeTarget(target)).toThrow(/target/i);
  });
});

describe("evaluateScope", () => {
  it("lets a deny rule override a wildcard allow", () => {
    const decision = evaluateScope(
      normalizeTarget("https://admin.example.test"),
      [allow("*.example.test"), { action: "deny", host: "admin.example.test" }],
    );

    expect(decision).toMatchObject({
      allowed: false,
      reason: "matched_deny",
    });
  });

  it("matches wildcard subdomains but not the parent host", () => {
    const rules = [allow("*.example.test")];

    expect(
      evaluateScope(normalizeTarget("https://api.example.test"), rules).allowed,
    ).toBe(true);
    expect(
      evaluateScope(normalizeTarget("https://example.test"), rules).allowed,
    ).toBe(false);
  });

  it("requires matching scheme and port when a rule constrains them", () => {
    const rules = [allow("example.test", { scheme: "https", port: 8443 })];

    expect(
      evaluateScope(normalizeTarget("https://example.test:8443"), rules)
        .allowed,
    ).toBe(true);
    expect(
      evaluateScope(normalizeTarget("https://example.test"), rules).allowed,
    ).toBe(false);
    expect(
      evaluateScope(normalizeTarget("http://example.test:8443"), rules).allowed,
    ).toBe(false);
  });

  it("fails closed when no rule matches or no scope is selected", () => {
    const target = normalizeTarget("http://127.0.0.1:3000");

    expect(evaluateScope(target, []).reason).toBe("no_selected_scope");
    expect(evaluateScope(target, [allow("localhost")]).reason).toBe(
      "no_matching_allow",
    );
  });
});
