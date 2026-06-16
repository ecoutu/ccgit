import * as p from "@clack/prompts";
import pc from "picocolors";
import type { Finding } from "./secrets";

export function info(msg: string): void {
  console.log(msg);
}

export function success(msg: string): void {
  console.log(pc.green("✔ ") + msg);
}

export function warn(msg: string): void {
  console.log(pc.yellow("⚠ ") + msg);
}

export function error(msg: string): void {
  console.error(pc.red("✖ ") + msg);
}

export function formatFindings(findings: Finding[]): string {
  return findings.map((f) => `  ${pc.red(`${f.file}:${f.line}`)} ${f.rule}`).join("\n");
}

// Re-export the prompt toolkit for command modules.
export { p };
