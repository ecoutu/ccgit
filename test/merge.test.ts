import { test, expect } from "bun:test";
import { extractFragment, applyFragment } from "../src/merge";

const live = {
  mcpServers: { context7: { command: "x" } },
  oauthAccount: { token: "secret" },
  userID: "abc",
  projects: {
    "/home/u/proj": { mcpServers: { local1: { command: "y" } }, history: [1, 2, 3] },
    "/home/u/other": { history: [9] },
  },
};

test("extractFragment picks only allowlisted keys + project mcp", () => {
  const frag = extractFragment(live, ["mcpServers"], true);
  expect(frag).toEqual({
    mcpServers: { context7: { command: "x" } },
    projects: { "/home/u/proj": { mcpServers: { local1: { command: "y" } } } },
  });
  expect(frag.oauthAccount).toBeUndefined();
  expect(frag.userID).toBeUndefined();
});

test("extractFragment without projectMcp omits projects", () => {
  const frag = extractFragment(live, ["mcpServers"], false);
  expect(frag.projects).toBeUndefined();
});

test("applyFragment merges into live, preserving untracked keys", () => {
  const frag = extractFragment(live, ["mcpServers"], true);
  const target = {
    oauthAccount: { token: "KEEP" },
    mcpServers: { existing: { command: "z" } },
    projects: { "/home/u/proj": { history: [42] } },
  };
  const result = applyFragment(target, frag);
  expect(result.oauthAccount).toEqual({ token: "KEEP" });
  expect(result.mcpServers).toEqual({ existing: { command: "z" }, context7: { command: "x" } });
  expect(result.projects["/home/u/proj"].history).toEqual([42]);
  expect(result.projects["/home/u/proj"].mcpServers).toEqual({ local1: { command: "y" } });
});

test("applyFragment replaces arrays wholesale, does not concatenate", () => {
  const result = applyFragment({ a: [1, 2, 3], keep: "x" }, { a: [9] });
  expect(result.a).toEqual([9]);
  expect(result.keep).toBe("x");
});
