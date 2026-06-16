# ccgit

Track your Claude Code configuration in git and materialize it onto any machine.

`ccgit` treats a git repository as the source of truth for your Claude Code config
and syncs it with the live `~/.claude` directory and `~/.claude.json`. It knows which
files are config, which are secrets, and which are disposable caches, and it merges
only your MCP-server config into the Claude-Code-owned `~/.claude.json` — leaving your
account, history, and caches untouched.

## Install

Requires [Bun](https://bun.sh) and `git`.

```bash
bun install
bun link   # exposes the `ccgit` command
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
bun test   # run the full suite
```

## License

MIT
