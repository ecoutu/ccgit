import { test, expect } from "bun:test";
import { classify, DEFAULT_RULES } from "../src/rules";

test("secrets classified before config (first match wins)", () => {
  expect(classify(".credentials.json", {})).toBe("secret");
  expect(classify("my-credentials-backup.json", {})).toBe("secret");
});

test("config patterns match", () => {
  expect(classify("CLAUDE.md", {})).toBe("config");
  expect(classify("settings.json", {})).toBe("config");
  expect(classify("settings.local.json", {})).toBe("config");
  expect(classify("statusline-command.sh", {})).toBe("config");
  expect(classify("commands", {})).toBe("config");
});

test("transient directories classified", () => {
  expect(classify("plugins", {})).toBe("transient");
  expect(classify("history.jsonl", {})).toBe("transient");
  expect(classify("stats-cache.json", {})).toBe("transient");
});

test("unmatched is unknown", () => {
  expect(classify("mystery.xyz", {})).toBe("unknown");
});

test("overrides take priority over defaults", () => {
  expect(classify("plugins", { "plugins/": "config" })).toBe("config");
  expect(classify("settings.json", { "settings.json": "secret" })).toBe("secret");
});

test("DEFAULT_RULES ordering puts secret first", () => {
  expect(DEFAULT_RULES[0].category).toBe("secret");
});

// Locks the Bun.Glob → globToRegExp swap: leading/trailing/mid * wildcards,
// dotfile globs, and slash-bearing override patterns must still classify.
test("glob wildcards classify (regexp translation parity)", () => {
  expect(classify(".env.local", {})).toBe("secret"); // .env*
  expect(classify("server.key", {})).toBe("secret"); // *.key
  expect(classify("security_warnings_state_v2.json", {})).toBe("secret");
  expect(classify("settings.local.json", {})).toBe("config"); // settings*.json
  expect(classify("build-cache.json", {})).toBe("transient"); // *-cache.json
  expect(classify("notes.txt", {})).toBe("unknown");
});

test("slash-bearing override patterns match via glob", () => {
  // lib/ has no default rule and .py no default extension, so only the override
  // can classify these — isolating the slash-glob behavior.
  expect(classify("lib/one.py", { "lib/*.py": "config" })).toBe("config");
  expect(classify("lib/nested/two.py", { "lib/*.py": "config" })).toBe("unknown"); // * stays in-segment
});
