/**
 * Integration test: MCP server over stdio.
 *
 * Spawns the real server process via StdioClientTransport and verifies
 * prompts/list, tools/list, and resources/list responses.
 *
 * Auto-skips if no indexed repos exist (~/.gitnexus/registry.json).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

const REGISTRY_PATH = path.join(
  process.env.HOME || '~',
  '.gitnexus',
  'registry.json'
);

const hasIndexedRepos = existsSync(REGISTRY_PATH);

const EXPECTED_PROMPT_NAMES = [
  'debugging',
  'detect_impact',
  'exploring',
  'generate_map',
  'impact_analysis',
  'refactoring',
];

let client: Client;
let transport: StdioClientTransport;

beforeAll(async () => {
  if (!hasIndexedRepos) return;

  transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(PROJECT_ROOT, 'dist', 'mcp.js')],
    cwd: PROJECT_ROOT,
  });

  client = new Client({ name: 'integration-test', version: '0.0.1' });
  await client.connect(transport);
});

afterAll(async () => {
  if (client) {
    await client.close();
  }
});

describe.skipIf(!hasIndexedRepos)('MCP server over stdio', () => {
  it('prompts/list returns 6 prompts with correct names', async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts).toHaveLength(6);
    const names = prompts.map((p) => p.name).sort();
    expect(names).toEqual(EXPECTED_PROMPT_NAMES);
  });

  it('tools/list returns expected tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    const names = tools.map((t) => t.name);
    expect(names).toContain('list_repos');
    expect(names).toContain('query');
    expect(names).toContain('context');
    expect(names).toContain('impact');
  });

  it('resources/list returns static resources', async () => {
    const { resources } = await client.listResources();
    expect(resources.length).toBeGreaterThan(0);
  });
});
