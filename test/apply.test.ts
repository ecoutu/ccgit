import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { apply } from "../src/commands/apply";
import type { Manifest } from "../src/config";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "ccgit-apply-"));
  const home = join(root, "home");
  const repo = join(root, "repo");
  mkdirSync(home, { recursive: true });
  mkdirSync(repo, { recursive: true });
  return { root, home, repo };
}

test("apply writes copy entries and merges fragment preserving live keys", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(repo, "CLAUDE.md"), "# from repo\n");
    writeFileSync(join(repo, ".claude.json"), JSON.stringify({ mcpServers: { c7: { command: "x" } } }));
    writeFileSync(join(home, ".claude.json"), JSON.stringify({ oauthAccount: { token: "KEEP" } }));

    const manifest: Manifest = {
      claudeHome: home,
      entries: [
        { path: "CLAUDE.md", strategy: "copy", mode: "write" },
        { path: join(home, ".claude.json"), strategy: "merge", mergeKeys: ["mcpServers"], mergeProjectMcp: true },
      ],
      overrides: {},
    };
    apply(repo, manifest);

    expect(readFileSync(join(home, "CLAUDE.md"), "utf8")).toBe("# from repo\n");
    const merged = JSON.parse(readFileSync(join(home, ".claude.json"), "utf8"));
    expect(merged.oauthAccount).toEqual({ token: "KEEP" });
    expect(merged.mcpServers).toEqual({ c7: { command: "x" } });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("apply with symlink mode creates a symlink", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(repo, "CLAUDE.md"), "# linked\n");
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "CLAUDE.md", strategy: "copy", mode: "symlink" }],
      overrides: {},
    };
    apply(repo, manifest);
    expect(lstatSync(join(home, "CLAUDE.md")).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(home, "CLAUDE.md"), "utf8")).toBe("# linked\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("apply backs up previous live state and returns the backup dir", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(repo, "CLAUDE.md"), "# new\n");
    writeFileSync(join(home, "CLAUDE.md"), "# old\n");
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "CLAUDE.md", strategy: "copy", mode: "write" }],
      overrides: {},
    };
    const backup = apply(repo, manifest);
    const files = readdirSync(backup);
    expect(files.length).toBe(1);
    expect(readFileSync(join(backup, files[0]), "utf8")).toBe("# old\n");
    expect(readFileSync(join(home, "CLAUDE.md"), "utf8")).toBe("# new\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("apply throws before destroying the live file when repo content is missing", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(home, "CLAUDE.md"), "# keep\n");
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "CLAUDE.md", strategy: "copy", mode: "write" }],
      overrides: {},
    };
    expect(() => apply(repo, manifest)).toThrow(/missing captured content/);
    expect(readFileSync(join(home, "CLAUDE.md"), "utf8")).toBe("# keep\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
