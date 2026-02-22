/**
 * Unit tests for MCP prompt handlers.
 *
 * Uses MCP SDK's Client + InMemoryTransport to connect to createMCPServer()
 * in-process. The mock backend is minimal — prompt handlers don't touch it.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMCPServer } from '../../mcp/server.js';
import type { LocalBackend } from '../../mcp/local/local-backend.js';

const EXPECTED_PROMPTS = [
  'detect_impact',
  'generate_map',
  'exploring',
  'debugging',
  'impact_analysis',
  'refactoring',
];

// Minimal mock — prompt handlers never call backend methods
const mockBackend = {} as LocalBackend;

let client: Client;
let closeTransports: () => Promise<void>;

beforeAll(async () => {
  const server = createMCPServer(mockBackend);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  client = new Client({ name: 'test-client', version: '0.0.1' });
  await client.connect(clientTransport);

  closeTransports = async () => {
    await client.close();
    await server.close();
  };
});

afterAll(async () => {
  await closeTransports?.();
});

describe('prompts/list', () => {
  it('returns exactly 6 prompts', async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts).toHaveLength(6);
  });

  it('returns prompts with expected names', async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name).sort();
    expect(names).toEqual([...EXPECTED_PROMPTS].sort());
  });

  it('every prompt has a non-empty description', async () => {
    const { prompts } = await client.listPrompts();
    for (const prompt of prompts) {
      expect(prompt.description, `${prompt.name} missing description`).toBeTruthy();
      expect(prompt.description!.length).toBeGreaterThan(10);
    }
  });

  it('exploring.query is required', async () => {
    const { prompts } = await client.listPrompts();
    const exploring = prompts.find((p) => p.name === 'exploring')!;
    const queryArg = exploring.arguments!.find((a) => a.name === 'query');
    expect(queryArg).toBeDefined();
    expect(queryArg!.required).toBe(true);
  });

  it('debugging.symptom is required', async () => {
    const { prompts } = await client.listPrompts();
    const debugging = prompts.find((p) => p.name === 'debugging')!;
    const symptomArg = debugging.arguments!.find((a) => a.name === 'symptom');
    expect(symptomArg).toBeDefined();
    expect(symptomArg!.required).toBe(true);
  });

  it('refactoring.target and action are required', async () => {
    const { prompts } = await client.listPrompts();
    const refactoring = prompts.find((p) => p.name === 'refactoring')!;
    const targetArg = refactoring.arguments!.find((a) => a.name === 'target');
    const actionArg = refactoring.arguments!.find((a) => a.name === 'action');
    expect(targetArg).toBeDefined();
    expect(targetArg!.required).toBe(true);
    expect(actionArg).toBeDefined();
    expect(actionArg!.required).toBe(true);
  });
});

describe('prompts/get', () => {
  it('each prompt returns a user message', async () => {
    const argSets: Record<string, Record<string, string>> = {
      detect_impact: {},
      generate_map: {},
      exploring: { query: 'How does auth work?' },
      debugging: { symptom: 'TypeError: undefined' },
      impact_analysis: { target: 'handleLogin' },
      refactoring: { target: 'parseConfig', action: 'rename' },
    };

    for (const name of EXPECTED_PROMPTS) {
      const result = await client.getPrompt({ name, arguments: argSets[name] });
      expect(result.messages.length).toBeGreaterThanOrEqual(1);
      expect(result.messages[0].role).toBe('user');
    }
  });

  it('exploring interpolates query into message text', async () => {
    const result = await client.getPrompt({
      name: 'exploring',
      arguments: { query: 'payment processing' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('payment processing');
  });

  it('debugging interpolates symptom into message text', async () => {
    const result = await client.getPrompt({
      name: 'debugging',
      arguments: { symptom: 'NullPointerException in handler' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('NullPointerException in handler');
  });

  it('impact_analysis interpolates target into message text', async () => {
    const result = await client.getPrompt({
      name: 'impact_analysis',
      arguments: { target: 'UserService' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('UserService');
  });

  it('refactoring interpolates target and action into message text', async () => {
    const result = await client.getPrompt({
      name: 'refactoring',
      arguments: { target: 'parseConfig', action: 'extract' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('parseConfig');
    expect(text).toContain('extract');
  });

  it('generate_map interpolates repo into message text', async () => {
    const result = await client.getPrompt({
      name: 'generate_map',
      arguments: { repo: 'myrepo' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('myrepo');
  });

  it('exploring interpolates repo when provided', async () => {
    const result = await client.getPrompt({
      name: 'exploring',
      arguments: { query: 'test', repo: 'myrepo' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('myrepo');
  });

  it('refactoring branches correctly on action=rename', async () => {
    const result = await client.getPrompt({
      name: 'refactoring',
      arguments: { target: 'foo', action: 'rename' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('Rename workflow');
    expect(text).not.toContain('Extract workflow');
    expect(text).not.toContain('Split workflow');
  });

  it('refactoring branches correctly on action=extract', async () => {
    const result = await client.getPrompt({
      name: 'refactoring',
      arguments: { target: 'foo', action: 'extract' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('Extract workflow');
    expect(text).not.toContain('Rename workflow');
  });

  it('refactoring branches correctly on action=split', async () => {
    const result = await client.getPrompt({
      name: 'refactoring',
      arguments: { target: 'foo', action: 'split' },
    });
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain('Split workflow');
    expect(text).not.toContain('Rename workflow');
  });

  it('unknown prompt throws an error', async () => {
    await expect(
      client.getPrompt({ name: 'nonexistent_prompt' })
    ).rejects.toThrow();
  });
});
