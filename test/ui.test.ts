import { test, expect } from "bun:test";
import { formatFindings } from "../src/ui";

test("formatFindings renders file:line rule lines", () => {
  const out = formatFindings([{ file: "a.json", line: 3, rule: "sk-key" }]);
  expect(out).toContain("a.json:3");
  expect(out).toContain("sk-key");
});

test("formatFindings handles empty list", () => {
  expect(formatFindings([])).toBe("");
});
