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
