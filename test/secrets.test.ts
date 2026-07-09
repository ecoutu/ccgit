import { test, expect } from "bun:test";
import { scanContent, type Finding } from "../src/secrets";

test("detects sk- style keys with line number", () => {
  const text = "line one\napi = sk-abcdefghijklmnopqrstuvwxyz0123\nline three";
  const found = scanContent(text, "f.json");
  expect(found.length).toBeGreaterThan(0);
  expect(found[0].line).toBe(2);
  expect(found[0].file).toBe("f.json");
});

test("detects private key header", () => {
  const found = scanContent("-----BEGIN OPENSSH PRIVATE KEY-----", "id");
  expect(found.some((f) => f.rule === "private-key")).toBe(true);
});

test("detects AWS access key id", () => {
  const found = scanContent("key=AKIAIOSFODNN7EXAMPLE", "f");
  expect(found.some((f) => f.rule === "aws-access-key")).toBe(true);
});

test("does not flag ordinary config text", () => {
  const text = '{\n  "model": "claude-opus-4-8",\n  "verbose": true\n}';
  expect(scanContent(text, "settings.json")).toEqual([]);
});

test("does not flag a normal URL", () => {
  expect(scanContent('  "endpoint": "https://api.example.com/v1/resource/longish-name"', "settings.json")).toEqual([]);
});

test("does not flag a filesystem path", () => {
  expect(scanContent("/home/user/.local/share/mise/installs/bun/latest/bin", "f")).toEqual([]);
});

test("still flags a contiguous high-entropy token", () => {
  const found = scanContent("token=Xa9Qz2Lp7Vt4Rn8Kw3Yc6Bd1Mf5Hg0Js", "f");
  expect(found.some((f) => f.rule === "high-entropy")).toBe(true);
});

test("does not flag structured identifiers that merely look busy", () => {
  // Real content that previously tripped the entropy heuristic (~4.0-4.15):
  // MCP tool names, git branches, org IDs, console URL segments.
  const lines = [
    "Use `mcp__atlassian__addCommentToJiraIssue` for each comment:",
    '"branches":["feat/ENG-5578-jwoolvett-mcp-bq"]',
    "organizationId=997970628344&project=<GCP_PROJECT_ID>",
    "summaryFields=:false:32:beginning;cursorTimestamp=<ts>",
  ];
  for (const line of lines) {
    expect(scanContent(line, "f").filter((f) => f.rule === "high-entropy")).toEqual([]);
  }
});

test("still flags a random base64 secret blob", () => {
  const found = scanContent("aGVsbG8td29ybGQtc3VwZXItc2VjcmV0LXRva2VuLTEyMzQ1Ng==", "f");
  expect(found.some((f) => f.rule === "high-entropy")).toBe(true);
});

test("does not report duplicate findings for the same line+rule", () => {
  const found = scanContent("sk-abcdefghijklmnopqrstuvwxyz0123", "f");
  const keys = found.map((f) => `${f.line}:${f.rule}`);
  expect(new Set(keys).size).toBe(keys.length);
});
