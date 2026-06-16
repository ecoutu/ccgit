import { test, expect } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { expandHome, resolveClaudeHome, resolveEntryPath, repoPathForEntry, type Manifest } from "../src/config";

test("expandHome expands leading ~", () => {
  expect(expandHome("~/.claude")).toBe(join(homedir(), ".claude"));
  expect(expandHome("/abs/path")).toBe("/abs/path");
});

test("resolveClaudeHome precedence: --dir > env > manifest > default", () => {
  const saved = process.env.CCGIT_HOME;
  try {
    delete process.env.CCGIT_HOME;
    // --dir wins over everything
    process.env.CCGIT_HOME = "/from-env";
    expect(resolveClaudeHome({ dir: "/explicit" }, { claudeHome: "/from-manifest", entries: [], overrides: {} })).toBe("/explicit");
    // env wins over manifest when no --dir
    expect(resolveClaudeHome({}, { claudeHome: "/from-manifest", entries: [], overrides: {} })).toBe("/from-env");
    // manifest wins over default when no --dir and no env
    delete process.env.CCGIT_HOME;
    expect(resolveClaudeHome({}, { claudeHome: "/from-manifest", entries: [], overrides: {} })).toBe("/from-manifest");
  } finally {
    if (saved === undefined) delete process.env.CCGIT_HOME;
    else process.env.CCGIT_HOME = saved;
  }
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
