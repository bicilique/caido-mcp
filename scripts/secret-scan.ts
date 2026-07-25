import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Detector = { label: string; pattern: RegExp };

const detectors: readonly Detector[] = [
  {
    label: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    label: "assigned Caido credential",
    pattern:
      /\bCAIDO_(?:PAT|TOKEN)\s*[:=]\s*["']?(?!<|operator-supplied|example|test|redacted|your-)[A-Za-z0-9._~+/=-]{20,}/i,
  },
];

const tracked = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const findings: string[] = [];

for (const path of tracked) {
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    for (const detector of detectors) {
      detector.pattern.lastIndex = 0;
      if (detector.pattern.test(line)) {
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
  console.log(`Secret scan passed (${tracked.length} tracked files).`);
}
