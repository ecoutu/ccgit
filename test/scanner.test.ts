import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { scan, type Candidate } from "../src/scanner";

test("scan classifies top-level entries", () => {
  const dir = mkdtempSync(join(tmpdir(), "ccgit-scan-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "hi");
    writeFileSync(join(dir, ".credentials.json"), "{}");
    writeFileSync(join(dir, "mystery.xyz"), "?");
    mkdirSync(join(dir, "plugins"));
    mkdirSync(join(dir, "commands"));

    const result = scan(dir, {});
    const byPath = Object.fromEntries(result.map((c) => [c.path, c]));
    expect(byPath["CLAUDE.md"].category).toBe("config");
    expect(byPath["CLAUDE.md"].isDir).toBe(false);
    expect(byPath[".credentials.json"].category).toBe("secret");
    expect(byPath["mystery.xyz"].category).toBe("unknown");
    expect(byPath["plugins"].category).toBe("transient");
    expect(byPath["plugins"].isDir).toBe(true);
    expect(byPath["commands"].category).toBe("config");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
