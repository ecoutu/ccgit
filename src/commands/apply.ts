import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
  renameSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { Manifest, Entry } from "../config";
import { resolveEntryPath, repoPathForEntry } from "../config";
import { applyFragment } from "../merge";

function backupDir(repoDir: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(repoDir, ".ccgit-backups", stamp);
}

function backup(entry: Entry, index: number, claudeHome: string, dest: string): void {
  const live = resolveEntryPath(entry, claudeHome);
  if (!existsSync(live)) return;
  // Prefix with the entry index so distinct paths can't collide after flattening.
  const safe = `${index}-${entry.path.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const target = join(dest, safe);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(live, target, { recursive: true, dereference: true });
}

function applyCopy(entry: Entry, claudeHome: string, repoDir: string): void {
  const src = repoPathForEntry(entry, repoDir);
  const dest = resolveEntryPath(entry, claudeHome);
  if (!existsSync(src)) {
    throw new Error(
      `Repo is missing captured content for entry "${entry.path}". Run \`ccgit capture\` first.`,
    );
  }
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  if (entry.mode === "symlink") symlinkSync(src, dest);
  else cpSync(src, dest, { recursive: true });
}

function applyMerge(entry: Entry, claudeHome: string, repoDir: string): void {
  const src = repoPathForEntry(entry, repoDir);
  const dest = resolveEntryPath(entry, claudeHome);
  if (!existsSync(src)) {
    throw new Error(
      `Repo is missing captured fragment for entry "${entry.path}". Run \`ccgit capture\` first.`,
    );
  }
  let fragment: unknown;
  try {
    fragment = JSON.parse(readFileSync(src, "utf8"));
  } catch (e) {
    throw new Error(`Failed to parse repo fragment at ${src}: ${(e as Error).message}`);
  }
  let live: unknown = {};
  if (existsSync(dest)) {
    try {
      live = JSON.parse(readFileSync(dest, "utf8"));
    } catch (e) {
      throw new Error(`Failed to parse live JSON at ${dest}: ${(e as Error).message}`);
    }
  }
  const merged = applyFragment(live, fragment);
  const tmp = dest + ".ccgit.tmp";
  writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n");
  renameSync(tmp, dest);
}

// Materializes the repo onto the live config, backing up the prior live state
// first. Returns the backup directory so callers can surface it to the user.
export function apply(repoDir: string, manifest: Manifest): string {
  const dest = backupDir(repoDir);
  manifest.entries.forEach((entry, i) => backup(entry, i, manifest.claudeHome, dest));
  for (const entry of manifest.entries) {
    if (entry.strategy === "merge") applyMerge(entry, manifest.claudeHome, repoDir);
    else applyCopy(entry, manifest.claudeHome, repoDir);
  }
  return dest;
}
