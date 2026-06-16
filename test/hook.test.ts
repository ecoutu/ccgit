import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, existsSync, readFileSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { renderHook, installHook } from "../src/hook";

test("renderHook invokes ccgit scan --staged", () => {
  expect(renderHook()).toContain("ccgit scan --staged");
});

test("installHook writes an executable pre-commit hook", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-hook-"));
  try {
    mkdirSync(join(dir, ".git", "hooks"), { recursive: true });
    installHook(dir);
    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    expect(existsSync(hookPath)).toBe(true);
    expect(readFileSync(hookPath, "utf8")).toContain("ccgit scan --staged");
    expect(statSync(hookPath).mode & 0o111).toBeGreaterThan(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
