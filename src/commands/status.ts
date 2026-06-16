import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Manifest, Entry } from "../config";
import { resolveEntryPath, repoPathForEntry } from "../config";
import { extractFragment } from "../merge";

export type EntryState = "in-sync" | "drift" | "missing-in-live" | "missing-in-repo";

export interface EntryStatus {
  path: string;
  state: EntryState;
}

function filesEqual(a: string, b: string): boolean {
  return readFileSync(a, "utf8") === readFileSync(b, "utf8");
}

function dirsEqual(a: string, b: string): boolean {
  const an = readdirSync(a).sort();
  const bn = readdirSync(b).sort();
  if (an.join("\0") !== bn.join("\0")) return false;
  for (const name of an) {
    const ap = join(a, name);
    const bp = join(b, name);
    const ad = statSync(ap).isDirectory();
    if (ad !== statSync(bp).isDirectory()) return false;
    if (ad ? !dirsEqual(ap, bp) : !filesEqual(ap, bp)) return false;
  }
  return true;
}

function copyState(entry: Entry, claudeHome: string, repoDir: string): EntryState {
  const repoPath = repoPathForEntry(entry, repoDir);
  const livePath = resolveEntryPath(entry, claudeHome);
  if (!existsSync(repoPath)) return "missing-in-repo";
  if (!existsSync(livePath)) return "missing-in-live";
  const isDir = statSync(repoPath).isDirectory();
  return (isDir ? dirsEqual(repoPath, livePath) : filesEqual(repoPath, livePath))
    ? "in-sync"
    : "drift";
}

function mergeState(entry: Entry, claudeHome: string, repoDir: string): EntryState {
  const repoPath = repoPathForEntry(entry, repoDir);
  const livePath = resolveEntryPath(entry, claudeHome);
  if (!existsSync(repoPath)) return "missing-in-repo";
  if (!existsSync(livePath)) return "missing-in-live";
  const live = JSON.parse(readFileSync(livePath, "utf8"));
  const liveFrag = extractFragment(live, entry.mergeKeys ?? [], entry.mergeProjectMcp ?? false);
  const repoFrag = JSON.parse(readFileSync(repoPath, "utf8"));
  return JSON.stringify(liveFrag) === JSON.stringify(repoFrag) ? "in-sync" : "drift";
}

export function entryStatus(repoDir: string, manifest: Manifest): EntryStatus[] {
  return manifest.entries.map((entry) => ({
    path: entry.path,
    state:
      entry.strategy === "merge"
        ? mergeState(entry, manifest.claudeHome, repoDir)
        : copyState(entry, manifest.claudeHome, repoDir),
  }));
}
