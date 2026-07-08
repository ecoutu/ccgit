import {
  cpSync,
  existsSync,
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

function scanTree(absPath: string): Finding[] {
  // A broken symlink (target removed) resolves to nothing — skip it. There is no
  // content to scan, and statSync/readFileSync would throw ENOENT on the target.
  if (!existsSync(absPath)) return [];
  if (statSync(absPath).isDirectory()) {
    const out: Finding[] = [];
    for (const e of readdirSync(absPath, { withFileTypes: true })) {
      out.push(...scanTree(join(absPath, e.name)));
    }
    return out;
  }
  return scanContent(readFileSync(absPath, "utf8"), absPath);
}

// A deferred write, produced only after a clean scan so that a secret in any
// entry aborts the whole capture before anything is written to the repo.
interface PlannedWrite {
  findings: Finding[];
  write: () => void;
}

function planCopy(entry: Entry, claudeHome: string, repoDir: string): PlannedWrite {
  const src = resolveEntryPath(entry, claudeHome);
  const dest = repoPathForEntry(entry, repoDir);
  if (!existsSync(src)) {
    throw new Error(`Managed entry not found in live config: ${src}`);
  }
  return {
    findings: scanTree(src),
    write: () => {
      mkdirSync(dirname(dest), { recursive: true });
      // dereference: a symlinked live path must store real content, not a link.
      // force: Bun's cpSync does not overwrite existing files by default, so
      // without this an updated live file never replaces the tracked copy.
      // filter: skip broken symlinks — dereference would throw on the missing target.
      cpSync(src, dest, { recursive: true, dereference: true, force: true, filter: (s) => existsSync(s) });
    },
  };
}

function planMerge(entry: Entry, claudeHome: string, repoDir: string): PlannedWrite {
  const src = resolveEntryPath(entry, claudeHome);
  const dest = repoPathForEntry(entry, repoDir);
  if (!existsSync(src)) {
    throw new Error(`Managed entry not found in live config: ${src}`);
  }
  let live: unknown;
  try {
    live = JSON.parse(readFileSync(src, "utf8"));
  } catch (e) {
    throw new Error(`Failed to parse JSON at ${src}: ${(e as Error).message}`);
  }
  const fragment = extractFragment(live, entry.mergeKeys ?? [], entry.mergeProjectMcp ?? false);
  const text = JSON.stringify(fragment, null, 2) + "\n";
  return {
    findings: scanContent(text, dest),
    write: () => {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, text);
    },
  };
}

export function capture(repoDir: string, manifest: Manifest): void {
  const planned: PlannedWrite[] = [];
  const findings: Finding[] = [];
  for (const entry of manifest.entries) {
    const p =
      entry.strategy === "merge"
        ? planMerge(entry, manifest.claudeHome, repoDir)
        : planCopy(entry, manifest.claudeHome, repoDir);
    findings.push(...p.findings);
    planned.push(p);
  }
  if (findings.length) throw new SecretError(findings);
  for (const p of planned) p.write();
}
