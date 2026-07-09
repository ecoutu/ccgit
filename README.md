# ccgit

Track your Claude Code configuration in git and materialize it onto any machine.

`ccgit` treats a git repository as the source of truth for your Claude Code config
and syncs it with the live `~/.claude` directory and `~/.claude.json`. It knows which
files are config, which are secrets, and which are disposable caches, and it merges
only your MCP-server config into the Claude-Code-owned `~/.claude.json` — leaving your
account, history, and caches untouched.

## Install

Requires `git`. Released builds are plain JS and run under Node or Bun:

```bash
npm install -g @ecoutu/ccgit   # or: bun add -g @ecoutu/ccgit
ccgit --help
```

Or run without installing:

```bash
npx @ecoutu/ccgit --help       # or: bun x @ecoutu/ccgit --help
```

### From source

Requires [Bun](https://bun.sh).

```bash
bun install
bun link   # exposes the `ccgit` command (runs src/cli.ts directly)
```

## Usage

```bash
ccgit init        # build a repo from your current ~/.claude
ccgit capture     # pull live config changes into the repo (scans for secrets)
ccgit apply       # materialize the repo onto this machine
ccgit status      # show drift between repo and live config
ccgit sync <url>  # push the repo to a remote for backup / other machines
```

Options: `--dir <path>` (or `CCGIT_HOME`) overrides the live config dir; `--repo <path>`
sets the repo dir (defaults to the current directory).

## What gets tracked

| Category  | Default | Examples |
|-----------|---------|----------|
| config    | tracked | `CLAUDE.md`, `settings*.json`, `commands/`, `agents/`, `hooks/` |
| secret    | never   | `.credentials.json`, `*.pem`, `.env*` |
| transient | never   | `plugins/`, `cache/`, `projects/`, `history.jsonl` |

Override any of this in `ccgit.toml` (`[overrides]`). See `ccgit.toml.example`.

### `~/.claude.json`

Claude Code owns and constantly rewrites `~/.claude.json` (it holds your account,
caches, and per-project chat history alongside your MCP servers). `ccgit` manages only
a fragment of it — by default the top-level `mcpServers` and per-project
`projects.<path>.mcpServers` — and deep-merges that fragment back in on `apply`,
leaving everything else intact.

## Safety

Three layers prevent committing secrets:

1. **Filename rules** classify known secret paths and never offer them for tracking.
2. **A content scan** runs on every `capture` (API keys, tokens, private keys, and a
   high-entropy heuristic) and hard-stops the operation on any finding.
3. **A git pre-commit hook** re-scans staged content, guarding manual commits.

## Development

```bash
bun test     # run the full suite
bun run build  # bundle the CLI to dist/cli.js (Node-runnable)
```

## Releasing

Releases are automated with [semantic-release](https://semantic-release.gitbook.io/).
On every push to `main`, the `Release` GitHub Actions workflow runs the tests, builds
`dist/cli.js`, and — based on the [Conventional Commits](https://www.conventionalcommits.org/)
in the new commits — determines the next version, then:

- publishes the package to npm,
- creates a GitHub release with generated notes,
- updates `CHANGELOG.md`, and
- commits and tags the release.

Commit messages drive the version bump (`fix:` → patch, `feat:` → minor,
`feat!:`/`BREAKING CHANGE:` → major). Commits like `chore:`/`docs:` produce no release.

**Required repository secrets:**

- `NPM_TOKEN` — an npm automation token with publish rights.
- `GH_PAT` — a fine-grained personal access token (Contents + Pull requests:
  read/write) owned by a user in the `main` branch ruleset's bypass list. The
  changelog/version-bump commit is pushed to protected `main`, which the default
  `GITHUB_TOKEN` (`github-actions[bot]`) cannot do — its push is rejected with
  `GH013`. Rotate this token before it expires or releases will start failing at
  the push step.

`GITHUB_TOKEN` is still provided automatically by Actions and left in place for
any other tooling in the release step.

## License

MIT
