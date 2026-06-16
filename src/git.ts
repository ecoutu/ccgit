import { existsSync } from "node:fs";
import { join } from "node:path";

function run(cwd: string, args: string[]): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    code: p.exitCode,
    stdout: p.stdout.toString(),
    stderr: p.stderr.toString(),
  };
}

function runOrThrow(cwd: string, args: string[]): string {
  const r = run(cwd, args);
  if (r.code !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

export function isRepo(dir: string): boolean {
  return existsSync(join(dir, ".git"));
}

export function init(dir: string): void {
  runOrThrow(dir, ["init", "-q"]);
  // Ensure commits work in CI/sandbox without global identity.
  runOrThrow(dir, ["config", "user.email", "ccgit@localhost"]);
  runOrThrow(dir, ["config", "user.name", "ccgit"]);
  runOrThrow(dir, ["config", "commit.gpgsign", "false"]);
}

export function add(dir: string, paths: string[]): void {
  runOrThrow(dir, ["add", "--", ...paths]);
}

export function commit(dir: string, message: string, opts: { noVerify?: boolean } = {}): void {
  const args = ["commit", "-q", "-m", message];
  // Tool-driven commits (init/capture) already ran the secret scan via the
  // capture path, so they bypass the pre-commit hook — which also avoids a hard
  // dependency on `ccgit` being on PATH. The hook still guards manual commits.
  if (opts.noVerify) args.push("--no-verify");
  runOrThrow(dir, args);
}

export function status(dir: string): string {
  return runOrThrow(dir, ["status", "--porcelain"]);
}

export function stagedFiles(dir: string): string[] {
  return runOrThrow(dir, ["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
}

export function showStaged(dir: string, file: string): string {
  return runOrThrow(dir, ["show", `:${file}`]);
}

export function setRemote(dir: string, url: string): void {
  const r = run(dir, ["remote", "add", "origin", url]);
  if (r.code !== 0) runOrThrow(dir, ["remote", "set-url", "origin", url]);
}

export function getRemote(dir: string): string | null {
  const r = run(dir, ["remote", "get-url", "origin"]);
  return r.code === 0 ? r.stdout.trim() : null;
}

export function push(dir: string): void {
  runOrThrow(dir, ["push", "-u", "origin", "HEAD"]);
}

export function pull(dir: string): void {
  runOrThrow(dir, ["pull", "--ff-only", "origin", "HEAD"]);
}
