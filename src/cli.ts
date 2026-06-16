import { join } from "node:path";
import * as git from "./git";
import { scanContent, type Finding } from "./secrets";
import { loadManifest, resolveClaudeHome, expandHome } from "./config";
import { scan } from "./scanner";
import { init } from "./commands/init";
import { capture } from "./commands/capture";
import { apply } from "./commands/apply";
import { entryStatus } from "./commands/status";
import { sync } from "./commands/sync";
import { p, success, error, warn, info, formatFindings } from "./ui";

const VERSION = "0.1.0";

export function scanStaged(repoDir: string): { code: number; findings: Finding[] } {
  const findings: Finding[] = [];
  for (const file of git.stagedFiles(repoDir)) {
    findings.push(...scanContent(git.showStaged(repoDir, file), file));
  }
  return { code: findings.length ? 1 : 0, findings };
}

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function manifestPath(repoDir: string): string {
  return join(repoDir, "ccgit.toml");
}

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...args] = argv;
  const repoDir = getFlag(args, "--repo") ?? process.cwd();
  const dirOpt = getFlag(args, "--dir");

  switch (cmd) {
    case "scan": {
      if (args.includes("--staged")) {
        const res = scanStaged(repoDir);
        if (res.code) {
          error("Secret content detected in staged files:");
          console.error(formatFindings(res.findings));
        }
        return res.code;
      }
      error("Unknown scan invocation");
      return 2;
    }

    case "init": {
      const claudeHome = resolveClaudeHome({ dir: dirOpt });
      // Prompt for unclassified entries up front (clack prompts are async).
      // Without a TTY, clack would block on EOF, so non-interactive runs
      // decline unknowns by default instead of hanging.
      const approvedUnknown = new Set<string>();
      const unknowns = scan(claudeHome, {}).filter((c) => c.category === "unknown");
      if (unknowns.length && !process.stdin.isTTY) {
        warn(
          `Skipping ${unknowns.length} unclassified entr${unknowns.length === 1 ? "y" : "ies"} (no TTY). ` +
            `Add them to ccgit.toml [overrides] to track.`,
        );
      } else {
        for (const c of unknowns) {
          const ans = await p.confirm({
            message: `Track unclassified entry "${c.path}"?`,
            initialValue: false,
          });
          if (ans === true) approvedUnknown.add(c.path);
        }
      }
      init({
        repoDir,
        claudeHome,
        claudeJson: expandHome("~/.claude.json"),
        reviewUnknown: (c) => approvedUnknown.has(c.path),
        confirmSecret: () => false,
      });
      success(`Initialized ccgit repo at ${repoDir}`);
      return 0;
    }

    case "capture": {
      const manifest = loadManifest(manifestPath(repoDir));
      capture(repoDir, manifest);
      const msg = getFlag(args, "-m");
      git.add(repoDir, ["."]);
      if (msg) git.commit(repoDir, msg, { noVerify: true });
      success("Captured live config into repo" + (msg ? " and committed" : " (staged)"));
      return 0;
    }

    case "apply": {
      const manifest = loadManifest(manifestPath(repoDir));
      apply(repoDir, manifest);
      success("Applied repo config to live ~/.claude");
      return 0;
    }

    case "status": {
      const manifest = loadManifest(manifestPath(repoDir));
      for (const s of entryStatus(repoDir, manifest)) {
        const label = s.state === "in-sync" ? success : warn;
        label(`${s.path}: ${s.state}`);
      }
      info("\nGit working tree:");
      info(git.status(repoDir) || "  (clean)");
      return 0;
    }

    case "sync": {
      const url = args.find((a) => !a.startsWith("-") && a !== "sync");
      const res = sync(repoDir, { remoteUrl: url, pull: args.includes("--pull") });
      success(`Synced with ${res.remote}` + (res.pushed ? " (pushed)" : ""));
      return 0;
    }

    case "--version":
    case "-v":
      info(`ccgit ${VERSION}`);
      return 0;

    case undefined:
    case "--help":
    case "-h":
      info(
        [
          "ccgit — track and materialize your Claude Code config",
          "",
          "Usage: ccgit <command> [options]",
          "",
          "Commands:",
          "  init                Build a repo from your live ~/.claude config",
          "  capture [-m msg]    Pull live config into the repo (scans for secrets)",
          "  apply               Materialize repo config into live ~/.claude",
          "  status              Show per-entry drift between repo and live",
          "  sync [url] [--pull] Push (and optionally pull) the repo remote",
          "",
          "Options:",
          "  --dir <path>        Override the live config dir (or set CCGIT_HOME)",
          "  --repo <path>       Repo dir (default: cwd)",
        ].join("\n"),
      );
      return 0;

    default:
      error(`Unknown command: ${cmd}`);
      return 2;
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
