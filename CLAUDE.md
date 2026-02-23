# GitNexus

> PUBLIC REPO — No secrets, no PII, no internal references. Assume strangers read everything.

## Purpose

Fork of [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus). Graph-powered code intelligence for AI agents — indexes codebases into a knowledge graph, exposes via MCP tools. This fork removes invasive environment writes from `analyze`, serves agent skills as MCP prompts, fixes CUDA fallback, and adds a local server mode for the web UI.

## Origin

- **Upstream**: `https://github.com/abhigyanpatwari/GitNexus.git` (origin remote)
- **Type**: Fork — see `docs/FORK.md` for full divergence details
- **What changed**: No env pollution from `analyze`, skills as MCP prompts (2→6), CUDA probe, local server onboarding, web UI LAN fix, test suite

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

# Local server mode (API + web UI together)
./gitnexus-local.sh start   # :4747 API, :5173 web UI
./gitnexus-local.sh stop

# Web UI dev server standalone
cd gitnexus-web && npm run dev
```

## Key Files

### CLI (`gitnexus/`)
- `src/cli/index.ts` — CLI entry point (commander)
- `src/core/analyze.ts` — Indexing pipeline
- `src/mcp/server.ts` — MCP server setup + tool/resource/prompt handlers
- `src/mcp/prompts.ts` — 6 MCP prompts (exploring, debugging, impact_analysis, refactoring, detect_impact, generate_map)
- `src/server/` — Express HTTP server (`gitnexus serve`)
- `src/storage/` — KuzuDB backend, connection pool, registry
- `src/lib/` — Parsing, graph construction, embeddings, search
- `src/__tests__/` — vitest test suite

### Web UI (`gitnexus-web/`)
- `src/App.tsx` — Main app component
- `src/components/DropZone.tsx` — Onboarding (ZIP / GitHub / Local Server tabs)
- `src/services/local-api.ts` — API client for local server mode

### Top-level
- `docs/FORK.md` — Full divergence documentation
- `gitnexus-local.sh` — Start/stop script for local servers
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

This project is indexed by GitNexus as **GitnexusV2** (1348 symbols, 3469 relationships, 104 execution flows).

GitNexus provides a knowledge graph over this codebase — call chains, blast radius, execution flows, and semantic search.

### Always Start Here

For any task involving code understanding, debugging, impact analysis, or refactoring:

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Match your task to a skill below** and **read that skill file**
3. **Follow the skill's workflow and checklist**

> If step 1 warns the index is stale, run `npx gitnexus analyze` in the terminal first.

### Skills

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |

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