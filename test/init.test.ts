import { test, expect } from "bun:test";
import { tmpdir, homedir } from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildManifest, init } from "../src/commands/init";
import type { Candidate } from "../src/scanner";

test("buildManifest: config auto-tracked, secret excluded, unknown via reviewer", () => {
  const candidates: Candidate[] = [
    { path: "CLAUDE.md", category: "config", isDir: false },
    { path: ".credentials.json", category: "secret", isDir: false },
    { path: "mystery.xyz", category: "unknown", isDir: false },
    { path: "plugins", category: "transient", isDir: true },
  ];
  // reviewer accepts unknown "mystery.xyz", declines nothing else
  const manifest = buildManifest("/home/u/.claude", candidates, {
    reviewUnknown: (c) => c.path === "mystery.xyz",
    confirmSecret: () => false,
  });
  const paths = manifest.entries.map((e) => e.path);
  expect(paths).toContain("CLAUDE.md");
  expect(paths).toContain("mystery.xyz");
  expect(paths).not.toContain(".credentials.json");
  expect(paths).not.toContain("plugins");
  // ~/.claude.json merge entry always added
  expect(manifest.entries.some((e) => e.strategy === "merge")).toBe(true);
});

test("init writes manifest, captures, inits git, installs hook, commits", () => {
  const root = mkdtempSync(join(tmpdir(), "ccgit-init-"));
  const home = join(root, "home");
  const repo = join(root, "repo");
  mkdirSync(home, { recursive: true });
  mkdirSync(repo, { recursive: true });
  try {
    writeFileSync(join(home, "CLAUDE.md"), "# hi\n");
    writeFileSync(join(home, ".claude.json"), JSON.stringify({ mcpServers: {} }));

    init({
      repoDir: repo,
      claudeHome: home,
      claudeJson: join(home, ".claude.json"),
      reviewUnknown: () => false,
      confirmSecret: () => false,
    });

    expect(existsSync(join(repo, "ccgit.toml"))).toBe(true);
    expect(existsSync(join(repo, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(repo, ".git"))).toBe(true);
    expect(existsSync(join(repo, ".git", "hooks", "pre-commit"))).toBe(true);
    expect(readFileSync(join(repo, "ccgit.toml"), "utf8")).toContain("CLAUDE.md");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
