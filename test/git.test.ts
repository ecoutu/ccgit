import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { isRepo, init, add, commit, status, stagedFiles, showStaged } from "../src/git";

test("init/add/commit/status lifecycle on a temp repo", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-git-"));
  try {
    expect(isRepo(dir)).toBe(false);
    init(dir);
    expect(isRepo(dir)).toBe(true);

    writeFileSync(join(dir, "a.txt"), "secret-value\n");
    add(dir, ["a.txt"]);
    expect(stagedFiles(dir)).toContain("a.txt");
    expect(showStaged(dir, "a.txt")).toBe("secret-value\n");

    commit(dir, "first commit");
    expect(status(dir).trim()).toBe("");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
