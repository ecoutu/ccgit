import { test, expect } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { expandHome, resolveClaudeHome, resolveEntryPath, repoPathForEntry } from "../src/config";

test("expandHome expands leading ~", () => {
  expect(expandHome("~/.claude")).toBe(join(homedir(), ".claude"));
  expect(expandHome("/abs/path")).toBe("/abs/path");
});

test("resolveClaudeHome precedence: --dir > env > manifest > default", () => {
  expect(resolveClaudeHome({ dir: "/explicit" })).toBe("/explicit");
});

test("resolveEntryPath: relative joins claudeHome, ~ expands", () => {
  expect(resolveEntryPath({ path: "CLAUDE.md", strategy: "copy" }, "/home/u/.claude"))
    .toBe("/home/u/.claude/CLAUDE.md");
  expect(resolveEntryPath({ path: "~/.claude.json", strategy: "merge" }, "/home/u/.claude"))
    .toBe(join(homedir(), ".claude.json"));
});

test("repoPathForEntry: absolute/~ entries store by basename", () => {
  expect(repoPathForEntry({ path: "CLAUDE.md", strategy: "copy" }, "/repo"))
    .toBe("/repo/CLAUDE.md");
  expect(repoPathForEntry({ path: "~/.claude.json", strategy: "merge" }, "/repo"))
    .toBe("/repo/.claude.json");
});
