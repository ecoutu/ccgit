import { join } from "node:path";
import type { Candidate } from "../scanner";
import { scan } from "../scanner";
import type { Manifest, Entry } from "../config";
import { saveManifest } from "../config";
import { capture } from "./capture";
import * as git from "../git";
import { installHook } from "../hook";

export interface Reviewer {
  reviewUnknown: (c: Candidate) => boolean;
  confirmSecret: (c: Candidate) => boolean;
}

export function buildManifest(
  claudeHome: string,
  candidates: Candidate[],
  reviewer: Reviewer,
): Manifest {
  const entries: Entry[] = [];
  for (const c of candidates) {
    let track = false;
    if (c.category === "config") track = true;
    else if (c.category === "unknown") track = reviewer.reviewUnknown(c);
    else if (c.category === "secret") track = reviewer.confirmSecret(c);
    // transient: never auto-tracked
    if (track) {
      entries.push({ path: c.isDir ? c.path + "/" : c.path, strategy: "copy", mode: "write" });
    }
  }
  // Always manage the MCP fragment of ~/.claude.json.
  entries.push({
    path: "~/.claude.json",
    strategy: "merge",
    mergeKeys: ["mcpServers"],
    mergeProjectMcp: true,
  });
  return { claudeHome, entries, overrides: {} };
}

export interface InitOptions extends Reviewer {
  repoDir: string;
  claudeHome: string;
  claudeJson?: string;
}

export function init(opts: InitOptions): Manifest {
  const candidates = scan(opts.claudeHome, {});
  const manifest = buildManifest(opts.claudeHome, candidates, opts);
  if (opts.claudeJson) {
    const mergeEntry = manifest.entries.find((e) => e.strategy === "merge");
    if (mergeEntry) mergeEntry.path = opts.claudeJson;
  }
  saveManifest(join(opts.repoDir, "ccgit.toml"), manifest);
  capture(opts.repoDir, manifest);
  if (!git.isRepo(opts.repoDir)) git.init(opts.repoDir);
  installHook(opts.repoDir);
  git.add(opts.repoDir, ["."]);
  git.commit(opts.repoDir, "ccgit: initial config capture", { noVerify: true });
  return manifest;
}
