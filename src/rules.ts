import { basename } from "node:path";
import type { Category } from "./config";

export interface Rule {
  pattern: string;
  category: Category;
}

// Ordered: first match wins. Secrets first so they always take precedence.
export const DEFAULT_RULES: Rule[] = [
  { pattern: ".credentials.json", category: "secret" },
  { pattern: "*credentials*", category: "secret" },
  { pattern: "mcp-needs-auth-cache.json", category: "secret" },
  { pattern: "security_warnings_state_*", category: "secret" },
  { pattern: "*.key", category: "secret" },
  { pattern: "*.pem", category: "secret" },
  { pattern: "*.token", category: "secret" },
  { pattern: ".env*", category: "secret" },

  { pattern: "plugins/", category: "transient" },
  { pattern: "cache/", category: "transient" },
  { pattern: "projects/", category: "transient" },
  { pattern: "sessions/", category: "transient" },
  { pattern: "shell-snapshots/", category: "transient" },
  { pattern: "backups/", category: "transient" },
  { pattern: "debug/", category: "transient" },
  { pattern: "session-env/", category: "transient" },
  { pattern: "paste-cache/", category: "transient" },
  { pattern: "downloads/", category: "transient" },
  { pattern: "ide/", category: "transient" },
  { pattern: "history.jsonl", category: "transient" },
  { pattern: "stats-cache.json", category: "transient" },
  { pattern: "*.log", category: "transient" },
  { pattern: "*.bak", category: "transient" },
  { pattern: "*.orig", category: "transient" },
  { pattern: "*-cache.json", category: "transient" },

  { pattern: "*.md", category: "config" },
  { pattern: "settings*.json", category: "config" },
  { pattern: "*.sh", category: "config" },
  { pattern: "commands/", category: "config" },
  { pattern: "agents/", category: "config" },
  { pattern: "hooks/", category: "config" },
  { pattern: "output-styles/", category: "config" },
];

function matchPattern(pattern: string, relPath: string): boolean {
  const p = relPath.replace(/^\.\//, "");
  if (pattern.endsWith("/")) {
    const dir = pattern.slice(0, -1);
    return p === dir || p.startsWith(dir + "/");
  }
  if (pattern.includes("/")) {
    return new Bun.Glob(pattern).match(p);
  }
  const g = new Bun.Glob(pattern);
  return g.match(basename(p)) || g.match(p);
}

export function classify(relPath: string, overrides: Record<string, Category>): Category {
  for (const [pattern, category] of Object.entries(overrides)) {
    if (matchPattern(pattern, relPath)) return category;
  }
  for (const rule of DEFAULT_RULES) {
    if (matchPattern(rule.pattern, relPath)) return rule.category;
  }
  return "unknown";
}
