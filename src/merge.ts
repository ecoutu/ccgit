function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(target: any, src: any): any {
  if (!isPlainObject(target) || !isPlainObject(src)) return structuredClone(src);
  const out: Record<string, any> = { ...target };
  for (const k of Object.keys(src)) {
    out[k] = k in target ? deepMerge(target[k], src[k]) : structuredClone(src[k]);
  }
  return out;
}

export function extractFragment(live: any, keys: string[], projectMcp: boolean): Record<string, any> {
  const frag: Record<string, any> = {};
  for (const k of keys) {
    if (live && k in live) frag[k] = structuredClone(live[k]);
  }
  if (projectMcp && isPlainObject(live?.projects)) {
    const projects: Record<string, any> = {};
    for (const [p, val] of Object.entries(live.projects)) {
      if (isPlainObject(val) && isPlainObject((val as any).mcpServers)) {
        projects[p] = { mcpServers: structuredClone((val as any).mcpServers) };
      }
    }
    if (Object.keys(projects).length) frag.projects = projects;
  }
  return frag;
}

export function applyFragment(live: any, fragment: any): any {
  return deepMerge(live ?? {}, fragment);
}
