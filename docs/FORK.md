# Why This Fork Exists

This is a fork of [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus). The core indexing engine, knowledge graph, and MCP tools are unchanged. What changed is **how GitNexus delivers context to AI agents** — specifically, removing behavior that silently modifies the user's environment.

## The Problem

Upstream `gitnexus analyze` does four things beyond indexing:

1. **Creates or overwrites `CLAUDE.md`** in your repo root — injecting GitNexus instructions into Claude Code's project config
2. **Creates or overwrites `AGENTS.md`** in your repo root — same content, targeting Cursor/Windsurf/Cline
3. **Installs skill files** into `.claude/skills/gitnexus/` — writing 4 SKILL.md files into your project's Claude Code directory
4. **Registers a PreToolUse hook** in `~/.claude/hooks.json` — modifying your global Claude Code settings to intercept every Grep/Glob/Bash call

All of this happens automatically when you run `analyze`. There's no opt-in, no flag to skip it, and no warning. If you already have a `CLAUDE.md` with your own instructions, GitNexus appends its block (or replaces it on re-index). If you have carefully configured hooks, it adds its own entry to the global hooks file.

This is invasive. A code indexer shouldn't be writing agent configuration files, installing skills into editor directories, or modifying global settings.

## What This Fork Changes

### Removed from `analyze`

The `analyze` command now only indexes the codebase. It no longer:

- Imports or calls `generateAIContextFiles()` (from `ai-context.ts`)
- Imports or calls `registerClaudeHook()` (from `claude-hooks.ts`)
- Creates `CLAUDE.md` or `AGENTS.md`
- Installs anything into `.claude/skills/`
- Touches `~/.claude/hooks.json`

The files `ai-context.ts` and `claude-hooks.ts` still exist in the source tree but are dead code — nothing calls them. A guard test (`analyze-no-pollution.test.ts`) prevents re-introduction.

### Skills moved to MCP prompts

The 4 agent skills that were installed as static files:

| Skill file | MCP prompt |
|-----------|-----------|
| `.claude/skills/gitnexus/exploring/SKILL.md` | `exploring` prompt |
| `.claude/skills/gitnexus/debugging/SKILL.md` | `debugging` prompt |
| `.claude/skills/gitnexus/impact-analysis/SKILL.md` | `impact_analysis` prompt |
| `.claude/skills/gitnexus/refactoring/SKILL.md` | `refactoring` prompt |

These are now served as MCP prompts through the server. The server went from 2 prompts to 6. The prompt content is equivalent to the skill files — same workflows, same checklists, same tool sequences — but delivered through the MCP protocol instead of written to disk.

This is the correct approach: the MCP server already runs when an agent connects, and prompts are the standard mechanism for guided workflows. No files need to be written to the user's project or home directory.

### Test suite added

The project had zero tests. This fork adds:

- **Unit tests** for all 6 MCP prompt handlers (list, arguments, interpolation, branching)
- **Guard test** that reads `analyze.ts` source and asserts the removed imports/references stay removed
- **Integration test** that spawns the real MCP server over stdio (auto-skips if no indexed repos)

### Server refactor for testability

`startMCPServer(backend)` was split into:

- `createMCPServer(backend)` — creates the server and registers all handlers, returns it
- `startMCPServer(backend)` — calls `createMCPServer`, connects stdio, registers signal handlers

This lets tests connect an `InMemoryTransport` without spawning a process.

## What Is Not Changed

- The indexing pipeline (parsing, graph construction, KuzuDB, embeddings)
- All 7 MCP tools (list_repos, query, context, impact, detect_changes, rename, cypher)
- All MCP resources (repos, context, clusters, processes, schema)
- The 2 original MCP prompts (detect_impact, generate_map)
- The web UI
- Next-step hints on tool responses
- Multi-repo registry and connection pooling
- The `setup`, `serve`, `list`, `status`, `clean`, `wiki` CLI commands

## Summary

| Aspect | Upstream | This fork |
|--------|----------|-----------|
| `analyze` writes CLAUDE.md | Yes | No |
| `analyze` writes AGENTS.md | Yes | No |
| `analyze` installs skills to .claude/ | Yes | No |
| `analyze` modifies ~/.claude/hooks.json | Yes | No |
| Agent skills delivered via | Static files on disk | MCP prompts |
| MCP prompts | 2 | 6 |
| Test suite | None | Unit + integration |
