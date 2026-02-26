# GitNexus

> PUBLIC REPO — No secrets, no PII, no internal references. Assume strangers read everything.

## Purpose

Fork of [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus). Graph-powered code intelligence for AI agents — indexes codebases into a knowledge graph, exposes via MCP tools. This fork removes invasive environment writes from `analyze`, serves agent skills as MCP prompts, and fixes web UI LAN access.

## Origin

- **Upstream**: `https://github.com/abhigyanpatwari/GitNexus.git` (origin remote)
- **Type**: Fork — see `docs/FORK.md` for full divergence details
- **What changed**: No env pollution from `analyze`, skills as MCP prompts (2→6), web UI LAN fix, upstream build fixes, test suite

## Structure

This is a multi-package repo (no workspace manager):

| Directory | What | Type |
|-----------|------|------|
| `gitnexus/` | CLI + MCP server | Node.js, TypeScript, MCP Server |
| `gitnexus-web/` | Browser-based graph explorer + AI chat | React 18, Vite, Tailwind v4 |
| `eval/` | Evaluation suite | Python |
| `docs/` | Fork documentation | Markdown |
| `gitnexus-claude-plugin/` | Claude Code integration assets (hooks, skills) | Static files |
| `gitnexus-cursor-integration/` | Cursor integration assets | Static files |

## Build

```bash
# CLI / MCP server
cd gitnexus && npm install && npm run build

# Web UI
cd gitnexus-web && npm install && npm run build

# Make CLI available globally (from gitnexus/)
npm link
```

## Test

```bash
# CLI tests (vitest)
cd gitnexus && npm test
```

## Run

```bash
# Index a repo (from that repo's root)
gitnexus analyze

# Start MCP server (stdio, used by Claude Code / Cursor)
gitnexus mcp

# Local backend mode (API server — web UI auto-detects)
gitnexus serve              # :4747 REST API

# Web UI dev server (auto-connects to local backend if running)
cd gitnexus-web && npm run dev
```

## Key Files

### CLI (`gitnexus/`)
- `src/cli/index.ts` — CLI entry point (commander)
- `src/cli/analyze.ts` — Analyze command (indexing pipeline)
- `src/mcp/server.ts` — MCP server setup + tool/resource/prompt handlers (6 prompts)
- `src/server/api.ts` — REST API for local backend mode (`gitnexus serve`)
- `src/storage/` — KuzuDB backend, connection pool, registry
- `src/lib/` — Parsing, graph construction, embeddings, search
- `src/__tests__/` — vitest test suite

### Web UI (`gitnexus-web/`)
- `src/App.tsx` — Main app component
- `src/components/DropZone.tsx` — Onboarding (ZIP / GitHub / Local Server tabs)
- `src/services/backend.ts` — HTTP client for local backend mode
- `src/hooks/useBackend.ts` — React hook for backend connection lifecycle

### Top-level
- `docs/FORK.md` — Full divergence documentation
- `.mcp.json` — Points to local build (not upstream npm)

## Tech Stack

| Layer | CLI | Web |
|-------|-----|-----|
| Runtime | Node.js | Browser (WASM) |
| Parsing | Tree-sitter native | Tree-sitter WASM |
| Database | KuzuDB native | KuzuDB WASM |
| Embeddings | transformers.js | transformers.js (WebGPU/WASM) |
| Agent interface | MCP (stdio) | LangChain ReAct |
| Visualization | — | Sigma.js + Graphology (WebGL) |

## Practices

- After corrections: "Update CLAUDE.md so you don't make that mistake again"
- Keep `docs/notes/` for learnings that shouldn't bloat this file
- Plan first for complex tasks; re-plan when things go sideways
- This is a fork — when modifying, check whether the change diverges further from upstream or could be contributed back
- Guard test (`analyze-no-pollution.test.ts`) prevents re-introducing invasive writes — keep it passing

<!-- gitnexus:start -->
## GitNexus MCP

This project is indexed by GitNexus. Use the MCP tools and prompts to navigate the knowledge graph.

### Always Start Here

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Use the appropriate MCP prompt** for guided workflows (exploring, debugging, impact_analysis, refactoring)
3. **Or call tools directly** for specific queries

> If the index is stale, run `gitnexus analyze` in the terminal first.

### MCP Prompts (Guided Workflows)

| Task | MCP Prompt |
|------|-----------|
| Understand architecture / "How does X work?" | `exploring` |
| Blast radius / "What breaks if I change X?" | `impact_analysis` |
| Trace bugs / "Why is X failing?" | `debugging` |
| Rename / extract / split / refactor | `refactoring` |
| Pre-commit impact check | `detect_impact` |
| Generate architecture docs | `generate_map` |

### Tools Reference

| Tool | What it gives you |
|------|-------------------|
| `query` | Process-grouped code intelligence — execution flows related to a concept |
| `context` | 360-degree symbol view — categorized refs, processes it participates in |
| `impact` | Symbol blast radius — what breaks at depth 1/2/3 with confidence |
| `detect_changes` | Git-diff impact — what do your current changes affect |
| `rename` | Multi-file coordinated rename with confidence-tagged edits |
| `cypher` | Raw graph queries (read `gitnexus://repo/{name}/schema` first) |
| `list_repos` | Discover indexed repos |

### Resources Reference

Lightweight reads (~100-500 tokens) for navigation:

| Resource | Content |
|----------|---------|
| `gitnexus://repo/{name}/context` | Stats, staleness check |
| `gitnexus://repo/{name}/clusters` | All functional areas with cohesion scores |
| `gitnexus://repo/{name}/cluster/{clusterName}` | Area members |
| `gitnexus://repo/{name}/processes` | All execution flows |
| `gitnexus://repo/{name}/process/{processName}` | Step-by-step trace |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher |

### Graph Schema

**Nodes:** File, Function, Class, Interface, Method, Community, Process
**Edges (via CodeRelation.type):** CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES, MEMBER_OF, STEP_IN_PROCESS

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath
```

<!-- gitnexus:end -->