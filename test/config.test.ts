import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadManifest, saveManifest, type Manifest } from "../src/config";

test("saveManifest then loadManifest round-trips", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-"));
  try {
    const file = join(dir, "ccgit.toml");
    const m: Manifest = {
      claudeHome: "~/.claude",
      entries: [
        { path: "CLAUDE.md", strategy: "copy", mode: "write" },
        { path: "~/.claude.json", strategy: "merge", mergeKeys: ["mcpServers"], mergeProjectMcp: true },
      ],
      overrides: { "projects/": "config" },
    };
    saveManifest(file, m);
    const loaded = loadManifest(file);
    expect(loaded).toEqual(m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
