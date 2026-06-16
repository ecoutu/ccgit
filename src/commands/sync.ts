import * as git from "../git";

export interface SyncOptions {
  remoteUrl?: string;
  push?: boolean;
  pull?: boolean;
}

export interface SyncResult {
  remote: string;
  pushed: boolean;
  pulled: boolean;
}

export function sync(repoDir: string, opts: SyncOptions): SyncResult {
  let remote = git.getRemote(repoDir);
  if (!remote && opts.remoteUrl) {
    git.setRemote(repoDir, opts.remoteUrl);
    remote = opts.remoteUrl;
  }
  if (!remote) {
    throw new Error("No remote configured. Provide a remote URL: ccgit sync <url>");
  }
  let pulled = false;
  if (opts.pull) {
    git.pull(repoDir);
    pulled = true;
  }
  let pushed = false;
  if (opts.push !== false) {
    git.push(repoDir);
    pushed = true;
  }
  return { remote, pushed, pulled };
}
