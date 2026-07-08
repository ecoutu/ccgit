import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  symlinkSync,
  lstatSync,
} from "node:fs";
import { join } from "node:path";
import { capture, SecretError } from "../src/commands/capture";
import type { Manifest } from "../src/config";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "ccgit-cap-"));
  const home = join(root, "home");
  const repo = join(root, "repo");
  mkdirSync(home, { recursive: true });
  mkdirSync(repo, { recursive: true });
  return { root, home, repo };
}

test("capture copies config files and extracts mcp fragment", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(home, "CLAUDE.md"), "# rules\n");
    writeFileSync(
      join(home, ".claude.json"),
      JSON.stringify({ mcpServers: { c7: { command: "x" } }, oauthAccount: { token: "KEEP" } }),
    );
    const manifest: Manifest = {
      claudeHome: home,
      entries: [
        { path: "CLAUDE.md", strategy: "copy", mode: "write" },
        { path: join(home, ".claude.json"), strategy: "merge", mergeKeys: ["mcpServers"], mergeProjectMcp: true },
      ],
      overrides: {},
    };
    capture(repo, manifest);
    expect(readFileSync(join(repo, "CLAUDE.md"), "utf8")).toBe("# rules\n");
    const frag = JSON.parse(readFileSync(join(repo, ".claude.json"), "utf8"));
    expect(frag).toEqual({ mcpServers: { c7: { command: "x" } } });
    expect(frag.oauthAccount).toBeUndefined();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("capture aborts on detected secret", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(home, "CLAUDE.md"), "token = sk-abcdefghijklmnopqrstuvwxyz0123\n");
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "CLAUDE.md", strategy: "copy", mode: "write" }],
      overrides: {},
    };
    expect(() => capture(repo, manifest)).toThrow(SecretError);
    expect(existsSync(join(repo, "CLAUDE.md"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("capture dereferences symlinks, storing content not a link", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(home, "real.md"), "# real\n");
    symlinkSync(join(home, "real.md"), join(home, "CLAUDE.md"));
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "CLAUDE.md", strategy: "copy", mode: "write" }],
      overrides: {},
    };
    capture(repo, manifest);
    expect(lstatSync(join(repo, "CLAUDE.md")).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(repo, "CLAUDE.md"), "utf8")).toBe("# real\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("capture scans all entries before writing; a later secret aborts without writing earlier ones", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(home, "CLAUDE.md"), "# clean\n");
    writeFileSync(join(home, "RTK.md"), "key = sk-abcdefghijklmnopqrstuvwxyz0123\n");
    const manifest: Manifest = {
      claudeHome: home,
      entries: [
        { path: "CLAUDE.md", strategy: "copy", mode: "write" },
        { path: "RTK.md", strategy: "copy", mode: "write" },
      ],
      overrides: {},
    };
    expect(() => capture(repo, manifest)).toThrow(SecretError);
    expect(existsSync(join(repo, "CLAUDE.md"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("capture overwrites an existing tracked file with updated live content", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(home, "CLAUDE.md"), "# new content\n");
    writeFileSync(join(repo, "CLAUDE.md"), "# stale content\n"); // repo already tracks an old copy
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "CLAUDE.md", strategy: "copy", mode: "write" }],
      overrides: {},
    };
    capture(repo, manifest);
    expect(readFileSync(join(repo, "CLAUDE.md"), "utf8")).toBe("# new content\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("capture skips a broken symlink nested inside a directory entry", () => {
  const { root, home, repo } = setup();
  try {
    mkdirSync(join(home, "skills"));
    writeFileSync(join(home, "skills", "real.md"), "# ok\n");
    // a symlink whose target does not exist (e.g. a skill from a since-deleted repo)
    symlinkSync(join(home, "skills", "gone"), join(home, "skills", "dangling"));
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "skills", strategy: "copy", mode: "write" }],
      overrides: {},
    };
    capture(repo, manifest); // must not throw ENOENT on the dangling link
    expect(readFileSync(join(repo, "skills", "real.md"), "utf8")).toBe("# ok\n");
    expect(existsSync(join(repo, "skills", "dangling"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("capture throws a clear error when a managed entry is missing", () => {
  const { root, home, repo } = setup();
  try {
    const manifest: Manifest = {
      claudeHome: home,
      entries: [{ path: "nope.md", strategy: "copy", mode: "write" }],
      overrides: {},
    };
    expect(() => capture(repo, manifest)).toThrow(/not found in live config/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
