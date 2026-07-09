import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  statSync,
  readdirSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
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

// The write path deletes dest before copying (see planCopy), so a manifest
// entry that resolves outside the repo — a `..` traversal, or an unexpected
// absolute path — would rmSync a directory it has no business touching. Reject
// any dest that escapes repoDir before the plan is allowed to run.
function assertWithinRepo(dest: string, repoDir: string): void {
  const root = resolve(repoDir);
  const target = resolve(dest);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`Manifest entry resolves outside the repo: ${dest}`);
  }
}

// We capture dereferenced content (real files, not links), which a dangling
// symlink cannot provide — so skip it in both the scan and the copy rather than
// crashing on the stat that follows it. existsSync would over-skip here: it
// collapses *every* stat failure to false, so a permission error (EACCES/EPERM)
// on a readable-looking path would silently drop that file from both the secret
// scan and the copy. Only a genuine ENOENT (the dangling link's target is gone)
// is safe to skip; any other error is real and must fail the capture loudly.
function targetExists(absPath: string): boolean {
  try {
    statSync(absPath); // follows symlinks; throws ENOENT for a dangling link
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}

// Skipped paths are surfaced to the caller.
function scanTree(absPath: string, skipped: string[]): Finding[] {
  if (!targetExists(absPath)) {
    skipped.push(absPath);
    return [];
  }
  if (statSync(absPath).isDirectory()) {
    const out: Finding[] = [];
    for (const e of readdirSync(absPath, { withFileTypes: true })) {
      out.push(...scanTree(join(absPath, e.name), skipped));
    }
    return out;
  }
  return scanContent(readFileSync(absPath, "utf8"), absPath);
}

// A deferred write, produced only after a clean scan so that a secret in any
// entry aborts the whole capture before anything is written to the repo.
interface PlannedWrite {
  findings: Finding[];
  skipped: string[];
  write: () => void;
}

function planCopy(entry: Entry, claudeHome: string, repoDir: string): PlannedWrite {
  const src = resolveEntryPath(entry, claudeHome);
  const dest = repoPathForEntry(entry, repoDir);
  assertWithinRepo(dest, repoDir);
  if (!targetExists(src)) {
    throw new Error(`Managed entry not found in live config: ${src}`);
  }
  const skipped: string[] = [];
  return {
    findings: scanTree(src, skipped),
    skipped,
    write: () => {
      mkdirSync(dirname(dest), { recursive: true });
      // Remove the prior copy first: Bun's cpSync silently refuses to overwrite
      // an existing destination, so re-captures would never update a file/dir
      // already tracked in the repo. Deleting makes every write a fresh copy.
      rmSync(dest, { recursive: true, force: true });
      // dereference: a symlinked live path must store real content, not a link.
      // filter drops dangling links, whose target dereference() cannot resolve;
      // targetExists rethrows permission errors instead of silently skipping.
      cpSync(src, dest, {
        recursive: true,
        dereference: true,
        filter: (s) => targetExists(s),
      });
    },
  };
}

function planMerge(entry: Entry, claudeHome: string, repoDir: string): PlannedWrite {
  const src = resolveEntryPath(entry, claudeHome);
  const dest = repoPathForEntry(entry, repoDir);
  assertWithinRepo(dest, repoDir);
  if (!targetExists(src)) {
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
    skipped: [],
    write: () => {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, text);
    },
  };
}

export function capture(repoDir: string, manifest: Manifest): { skipped: string[] } {
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
  return { skipped: planned.flatMap((p) => p.skipped) };
}
