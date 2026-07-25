export function serializeStructuredResult(result: Record<string, unknown>): {
  content: [{ type: "text"; text: string }];
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
    structuredContent: result,
  };
}
