import { readdirSync } from "node:fs";
import { classify } from "./rules";
import type { Category } from "./config";

export interface Candidate {
  path: string;
  category: Category;
  isDir: boolean;
}

export function scan(claudeHome: string, overrides: Record<string, Category>): Candidate[] {
  const entries = readdirSync(claudeHome, { withFileTypes: true });
  const out: Candidate[] = [];
  for (const e of entries) {
    if (e.name === ".git") continue;
    out.push({ path: e.name, category: classify(e.name, overrides), isDir: e.isDirectory() });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
