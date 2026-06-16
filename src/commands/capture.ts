import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { Manifest, Entry } from "../config";
import { resolveEntryPath, repoPathForEntry } from "../config";
import { extractFragment } from "../merge";
import { scanContent, type Finding } from "../secrets";

export class SecretError extends Error {
  constructor(public findings: Finding[]) {
    super(`Secret content detected in ${findings.length} location(s)`);
    this.name = "SecretError";
  }
}

function scanFileOrThrow(absPath: string, label: string): void {
  const findings = scanContent(readFileSync(absPath, "utf8"), label);
  if (findings.length) throw new SecretError(findings);
}

function scanDirOrThrow(absDir: string): void {
  for (const e of readdirSync(absDir, { withFileTypes: true })) {
    const child = join(absDir, e.name);
    if (e.isDirectory()) scanDirOrThrow(child);
    else scanFileOrThrow(child, child);
  }
}

function captureCopy(entry: Entry, claudeHome: string, repoDir: string): void {
  const src = resolveEntryPath(entry, claudeHome);
  const dest = repoPathForEntry(entry, repoDir);
  if (statSync(src).isDirectory()) scanDirOrThrow(src);
  else scanFileOrThrow(src, src);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function captureMerge(entry: Entry, claudeHome: string, repoDir: string): void {
  const src = resolveEntryPath(entry, claudeHome);
  const dest = repoPathForEntry(entry, repoDir);
  const live = JSON.parse(readFileSync(src, "utf8"));
  const fragment = extractFragment(live, entry.mergeKeys ?? [], entry.mergeProjectMcp ?? false);
  const text = JSON.stringify(fragment, null, 2) + "\n";
  const findings = scanContent(text, dest);
  if (findings.length) throw new SecretError(findings);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, text);
}

export function capture(repoDir: string, manifest: Manifest): void {
  for (const entry of manifest.entries) {
    if (entry.strategy === "merge") captureMerge(entry, manifest.claudeHome, repoDir);
    else captureCopy(entry, manifest.claudeHome, repoDir);
  }
}
