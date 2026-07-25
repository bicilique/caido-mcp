import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Detector = {
  label: string;
  pattern: RegExp;
  credentialGroup?: number;
};

const placeholder =
  "(?!<|operator-supplied|example|test|redacted|your-|e2e-|caido_test)";
const detectors: readonly Detector[] = [
  {
    label: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    label: "assigned Caido credential",
    pattern: new RegExp(
      String.raw`\bCAIDO_(?:PAT|TOKEN)\s*[:=]\s*["']?${placeholder}([A-Za-z0-9._~+/=-]{20,})`,
      "i",
    ),
    credentialGroup: 1,
  },
  {
    label: "Authorization Bearer credential",
    pattern: new RegExp(
      String.raw`\bAuthorization\s*:\s*Bearer\s+${placeholder}([A-Za-z0-9._~+/=-]{12,})`,
      "i",
    ),
    credentialGroup: 1,
  },
  {
    label: "API key credential",
    pattern: new RegExp(
      String.raw`\bapi[_-]?key\b\s*["']?\s*[:=]\s*["']?${placeholder}([A-Za-z0-9._~+/=-]{12,})`,
      "i",
    ),
    credentialGroup: 1,
  },
  {
    label: "token cache credential",
    pattern: new RegExp(
      String.raw`\b(?:access[_-]?token|refresh[_-]?token|accessToken|refreshToken)\b\s*["']?\s*[:=]\s*["']?${placeholder}([A-Za-z0-9._~+/=-]{12,})`,
      "i",
    ),
    credentialGroup: 1,
  },
];

function looksLikeCredential(value: string): boolean {
  if (
    /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/u.test(value) ||
    value.length < 24 ||
    !/\d/u.test(value)
  ) {
    return false;
  }
  const counts = new Map<string, number>();
  for (const character of value) {
    counts.set(character, (counts.get(character) ?? 0) + 1);
  }
  const entropy = [...counts.values()].reduce((total, count) => {
    const probability = count / value.length;
    return total - probability * Math.log2(probability);
  }, 0);
  return counts.size >= 10 && entropy >= 3;
}

const rootIndex = process.argv.indexOf("--root");
const root = resolve(
  rootIndex === -1 ? process.cwd() : (process.argv[rootIndex + 1] ?? ""),
);
const candidates = execFileSync(
  "git",
  ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const findings: string[] = [];

for (const path of candidates) {
  let content: string;
  try {
    content = readFileSync(resolve(root, path), "utf8");
  } catch {
    continue;
  }
  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    for (const detector of detectors) {
      detector.pattern.lastIndex = 0;
      const match = detector.pattern.exec(line);
      if (
        match !== null &&
        (detector.credentialGroup === undefined ||
          looksLikeCredential(match[detector.credentialGroup] ?? ""))
      ) {
        findings.push(`${path}:${index + 1}: ${detector.label}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Potential committed secrets detected (values withheld):");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed (${candidates.length} candidate files).`);
}
