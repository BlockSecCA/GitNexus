/**
 * Guard test: ensures analyze.ts doesn't re-introduce removed AI context / hook code.
 *
 * Reads analyze.ts source and asserts no imports or references to the removed
 * modules. Fast (~1ms), deterministic, catches re-introduction of removed code.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANALYZE_PATH = path.resolve(__dirname, '../../cli/analyze.ts');

let source: string;

describe('analyze.ts no-pollution guard', () => {
  it('loads analyze.ts source', async () => {
    source = await readFile(ANALYZE_PATH, 'utf-8');
    expect(source.length).toBeGreaterThan(0);
  });

  it('does not import generateAIContextFiles', () => {
    expect(source).not.toMatch(/generateAIContextFiles/);
  });

  it('does not import registerClaudeHook', () => {
    expect(source).not.toMatch(/registerClaudeHook/);
  });

  it('does not import from ai-context module', () => {
    expect(source).not.toMatch(/from\s+['"].*ai-context/);
  });

  it('does not import from claude-hooks module', () => {
    expect(source).not.toMatch(/from\s+['"].*claude-hooks/);
  });

  it('does not reference CLAUDE.md', () => {
    expect(source).not.toMatch(/CLAUDE\.md/);
  });

  it('does not reference AGENTS.md', () => {
    expect(source).not.toMatch(/AGENTS\.md/);
  });

  it('does not reference .claude/skills', () => {
    expect(source).not.toMatch(/\.claude\/skills/);
  });
});
