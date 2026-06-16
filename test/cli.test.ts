import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import * as git from "../src/git";
import { scanStaged, main } from "../src/cli";

test("commands fail with a clear nonzero code when no ccgit.toml exists", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-nomani-"));
  try {
    const code = await main(["status", "--repo", dir]);
    expect(code).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanStaged returns nonzero exit and findings on staged secret", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-scanstaged-"));
  try {
    git.init(dir);
    writeFileSync(join(dir, "f.json"), 'token = sk-abcdefghijklmnopqrstuvwxyz0123\n');
    git.add(dir, ["f.json"]);
    const res = scanStaged(dir);
    expect(res.code).toBe(1);
    expect(res.findings.length).toBeGreaterThan(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanStaged returns zero on clean staged content", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-scanstaged2-"));
  try {
    git.init(dir);
    writeFileSync(join(dir, "f.json"), '{ "verbose": true }\n');
    git.add(dir, ["f.json"]);
    expect(scanStaged(dir).code).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
