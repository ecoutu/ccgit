import { readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "smol-toml";

export type Strategy = "copy" | "merge";
export type Mode = "write" | "symlink";
export type Category = "config" | "secret" | "transient" | "unknown";

export interface Entry {
  path: string;
  strategy: Strategy;
  mode?: Mode;
  mergeKeys?: string[];
  mergeProjectMcp?: boolean;
}

export interface Manifest {
  claudeHome: string;
  entries: Entry[];
  overrides: Record<string, Category>;
}

export function loadManifest(file: string): Manifest {
  const raw = parse(readFileSync(file, "utf8")) as any;
  const entries: Entry[] = (raw.entry ?? []).map((e: any) => {
    const entry: Entry = { path: e.path, strategy: e.strategy };
    if (e.mode !== undefined) entry.mode = e.mode;
    if (e.merge_keys !== undefined) entry.mergeKeys = e.merge_keys;
    if (e.merge_project_mcp !== undefined) entry.mergeProjectMcp = e.merge_project_mcp;
    return entry;
  });
  return {
    claudeHome: raw.settings?.claude_home ?? "~/.claude",
    entries,
    overrides: (raw.overrides ?? {}) as Record<string, Category>,
  };
}

export function saveManifest(file: string, m: Manifest): void {
  const obj: any = {
    settings: { claude_home: m.claudeHome },
    entry: m.entries.map((e) => {
      const o: any = { path: e.path, strategy: e.strategy };
      if (e.mode !== undefined) o.mode = e.mode;
      if (e.mergeKeys !== undefined) o.merge_keys = e.mergeKeys;
      if (e.mergeProjectMcp !== undefined) o.merge_project_mcp = e.mergeProjectMcp;
      return o;
    }),
  };
  if (Object.keys(m.overrides).length) obj.overrides = m.overrides;
  writeFileSync(file, stringify(obj));
}
