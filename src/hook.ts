import { writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

export function renderHook(): string {
  return `#!/bin/sh
# Installed by ccgit. Blocks commits containing detected secrets.
exec ccgit scan --staged
`;
}

export function installHook(repoDir: string): void {
  const hookPath = join(repoDir, ".git", "hooks", "pre-commit");
  writeFileSync(hookPath, renderHook());
  chmodSync(hookPath, 0o755);
}
