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

function backup(entry: Entry, claudeHome: string, dest: string): void {
  const live = resolveEntryPath(entry, claudeHome);
  if (!existsSync(live)) return;
  const target = join(dest, entry.path.replace(/[~/]/g, "_"));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(live, target, { recursive: true });
}

function applyCopy(entry: Entry, claudeHome: string, repoDir: string): void {
  const src = repoPathForEntry(entry, repoDir);
  const dest = resolveEntryPath(entry, claudeHome);
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  if (entry.mode === "symlink") symlinkSync(src, dest);
  else cpSync(src, dest, { recursive: true });
}

function applyMerge(entry: Entry, claudeHome: string, repoDir: string): void {
  const src = repoPathForEntry(entry, repoDir);
  const dest = resolveEntryPath(entry, claudeHome);
  const fragment = JSON.parse(readFileSync(src, "utf8"));
  const live = existsSync(dest) ? JSON.parse(readFileSync(dest, "utf8")) : {};
  const merged = applyFragment(live, fragment);
  const tmp = dest + ".ccgit.tmp";
  writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n");
  renameSync(tmp, dest);
}

export function apply(repoDir: string, manifest: Manifest): void {
  const dest = backupDir(repoDir);
  for (const entry of manifest.entries) backup(entry, manifest.claudeHome, dest);
  for (const entry of manifest.entries) {
    if (entry.strategy === "merge") applyMerge(entry, manifest.claudeHome, repoDir);
    else applyCopy(entry, manifest.claudeHome, repoDir);
  }
}
