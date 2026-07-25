import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "skill",
          include: ["packages/skill-evals/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "contract",
          include: ["packages/*/tests/**/*.contract.test.ts"],
          environment: "node",
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
