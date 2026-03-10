# Why This Fork Exists

This is a fork of [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus). The core indexing engine, knowledge graph, MCP tools, local backend mode, and web UI are all upstream code. What this fork changes is **how GitNexus delivers context to AI agents** — specifically, removing behavior that silently modifies the user's environment.

## The Problem

Upstream `gitnexus analyze` does four things beyond indexing:

1. **Creates or overwrites `CLAUDE.md`** in your repo root — injecting GitNexus instructions into Claude Code's project config
2. **Creates or overwrites `AGENTS.md`** in your repo root — same content, targeting Cursor/Windsurf/Cline
3. **Installs skill files** into `.claude/skills/gitnexus/` — writing 6 SKILL.md files into your project's Claude Code directory
4. **Registers a PreToolUse hook** in `~/.claude/hooks.json` — modifying your global Claude Code settings to intercept every Grep/Glob/Bash call

All of this happens automatically when you run `analyze`. There's no opt-in, no flag to skip it, and no warning. If you already have a `CLAUDE.md` with your own instructions, GitNexus appends its block (or replaces it on re-index). If you have carefully configured hooks, it adds its own entry to the global hooks file.

The hook is particularly problematic: it fires on **every** search tool call across **all** projects, even ones where you don't want graph augmentation. It injects context into Claude's responses whether you asked for it or not, and adds latency (8s timeout) to every Grep/Glob/Bash operation.

This is invasive. A code indexer shouldn't be writing agent configuration files, installing skills into editor directories, or modifying global settings.

## Contributions to Upstream

This fork contributed fixes upstream via issues and PRs:

| Contribution | Status | Upstream |
|-------------|--------|----------|
| CUDA fallback probe (PR #58) | **Merged** | Now in upstream |
| Skills-to-MCP-prompts proposal (PR #57) | Closed | Influenced upstream's plugin rework (PR #68) |
| analyze env pollution (issue #52) | Discussion | Acknowledged but not fixed |
| Web UI LAN IP bug (issue #55) | Open | Still broken upstream |
| Local server mode request (issue #54) | Closed | Implemented by upstream (PR #49) |

## What This Fork Changes

### Removed from `analyze`

The `analyze` command now only indexes the codebase. It no longer:

- Imports or calls `generateAIContextFiles()` (from `ai-context.ts`)
- Imports or calls `registerClaudeHook()` (from `claude-hooks.ts`)
- Creates `CLAUDE.md` or `AGENTS.md`
- Installs anything into `.claude/skills/`
- Touches `~/.claude/hooks.json`

A guard test (`analyze-no-pollution.test.ts`) prevents re-introduction.

### Skills delivered as MCP prompts

The 4 agent skills that upstream installs as static files are served as MCP prompts through the server instead:

| Upstream skill file | Fork MCP prompt |
|-----------|-----------|
| `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` | `exploring` |
| `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` | `debugging` |
| `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` | `impact_analysis` |
| `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` | `refactoring` |

The MCP server serves 6 prompts (upstream's 2 originals + our 4). Same workflows, same checklists — delivered through the MCP protocol instead of written to disk.

### Web UI git clone fix for non-localhost access

Upstream's git clone proxy detection checks `window.location.hostname === 'localhost'` to decide whether to use the hosted Vercel proxy. When accessing the dev server via a LAN IP (headless setup), it falls through to `/api/proxy` which doesn't exist on Vite, breaking GitHub URL cloning.

This fork changes the check to `!window.location.hostname.endsWith('.vercel.app')` — any non-Vercel host uses the hosted proxy.

### Upstream build fixes

Upstream's merge conflict resolution (PR #66) introduced two build issues that this fork fixes:

- **Duplicate `ftsLoaded` declaration** in `kuzu-adapter.ts` — `let ftsLoaded` declared twice at module scope
- **Missing `isBackendMode` in `AppState`** — `EmbeddingStatus.tsx` references a property that was never added to the interface; fixed by using the `useBackend` hook directly

### MCP defaults to local build

The `.mcp.json` points at the local fork build (`node gitnexus/dist/cli/index.js mcp`) instead of `npx -y gitnexus@latest mcp`.

### Test suite

- **Unit tests** for all 6 MCP prompt handlers (list, arguments, interpolation, branching)
- **Guard test** that reads `analyze.ts` source and asserts the removed imports/references stay removed
- **Integration test** that spawns the real MCP server over stdio (auto-skips if no indexed repos)

## What Is Not Changed

Everything else is upstream code:

- The indexing pipeline (parsing, graph construction, KuzuDB, embeddings)
- All MCP tools (list_repos, query, context, impact, detect_changes, rename, cypher)
- All MCP resources (repos, context, clusters, processes, schema)
- The 2 original MCP prompts (detect_impact, generate_map)
- The web UI including local backend mode (PR #49)
- The `serve` command and REST API
- The Claude Code plugin infrastructure (`gitnexus-claude-plugin/`)
- Next-step hints on tool responses
- Multi-repo registry and connection pooling
- The `setup`, `list`, `status`, `clean`, `wiki` CLI commands
- CUDA fallback (our PR #58, now upstream)

## Summary

| Aspect | Upstream | This fork |
|--------|----------|-----------|
| `analyze` writes CLAUDE.md | Yes | No |
| `analyze` writes AGENTS.md | Yes | No |
| `analyze` installs skills to .claude/ | Yes | No |
| `analyze` modifies ~/.claude/hooks.json | Yes | No |
| Agent skills delivered via | Static files on disk | MCP prompts |
| MCP prompts | 2 | 6 |
| `.mcp.json` server | `npx -y gitnexus@latest mcp` | Local build |
| Web UI git clone via LAN IP | Broken (wrong proxy) | Works |
| Test suite | None | Unit + integration |
