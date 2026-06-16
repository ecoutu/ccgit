import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import * as git from "../src/git";
import { sync } from "../src/commands/sync";

test("sync sets remote when given a url and none exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-sync-"));
  const remote = mkdtempSync(join(tmpdir(), "ccgit-remote-"));
  try {
    git.init(dir);
    // bare remote to push into
    Bun.spawnSync(["git", "init", "--bare", remote]);

    const result = sync(dir, { remoteUrl: remote, push: false });
    expect(result.remote).toBe(remote);
    expect(git.getRemote(dir)).toBe(remote);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(remote, { recursive: true, force: true });
  }
});

test("sync throws if no remote configured and none provided", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-sync2-"));
  try {
    git.init(dir);
    expect(() => sync(dir, {})).toThrow();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
