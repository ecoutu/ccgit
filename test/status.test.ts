import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { entryStatus } from "../src/commands/status";
import type { Manifest } from "../src/config";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "ccgit-status-"));
  const home = join(root, "home");
  const repo = join(root, "repo");
  mkdirSync(home, { recursive: true });
  mkdirSync(repo, { recursive: true });
  return { root, home, repo };
}

test("entryStatus reports in-sync, drifted, and missing", () => {
  const { root, home, repo } = setup();
  try {
    writeFileSync(join(repo, "CLAUDE.md"), "same\n");
    writeFileSync(join(home, "CLAUDE.md"), "same\n");
    writeFileSync(join(repo, "settings.json"), "{}\n");
    writeFileSync(join(home, "settings.json"), "{ }\n"); // drift
    writeFileSync(join(repo, "RTK.md"), "x\n"); // missing in live

    const manifest: Manifest = {
      claudeHome: home,
      entries: [
        { path: "CLAUDE.md", strategy: "copy" },
        { path: "settings.json", strategy: "copy" },
        { path: "RTK.md", strategy: "copy" },
      ],
      overrides: {},
    };
    const result = entryStatus(repo, manifest);
    const byPath = Object.fromEntries(result.map((r) => [r.path, r.state]));
    expect(byPath["CLAUDE.md"]).toBe("in-sync");
    expect(byPath["settings.json"]).toBe("drift");
    expect(byPath["RTK.md"]).toBe("missing-in-live");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
