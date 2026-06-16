export interface Finding {
  file: string;
  line: number;
  rule: string;
}

interface Detector {
  rule: string;
  re: RegExp;
}

const DETECTORS: Detector[] = [
  { rule: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { rule: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { rule: "sk-key", re: /\bsk-[A-Za-z0-9_-]{16,}\b/ },
  { rule: "bearer-token", re: /bearer\s+[A-Za-z0-9._-]{20,}/i },
  {
    rule: "assigned-secret",
    re: /(api[_-]?key|secret|token|password)["']?\s*[:=]\s*["'][A-Za-z0-9._\-+/=]{16,}["']/i,
  },
];

function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  let e = 0;
  for (const k in freq) {
    const p = freq[k] / s.length;
    e -= p * Math.log2(p);
  }
  return e;
}

const HIGH_ENTROPY_TOKEN = /[A-Za-z0-9+=_-]{20,}/g;

export function scanContent(text: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    for (const d of DETECTORS) {
      if (d.re.test(line)) findings.push({ file, line: lineNo, rule: d.rule });
    }
    for (const m of line.match(HIGH_ENTROPY_TOKEN) ?? []) {
      if (shannonEntropy(m) > 4.0) {
        findings.push({ file, line: lineNo, rule: "high-entropy" });
        break;
      }
    }
  }
  return findings.filter((f) => {
    const key = `${f.file}:${f.line}:${f.rule}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
