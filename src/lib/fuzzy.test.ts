import { describe, expect, it } from 'vitest';
import { fuzzyScore } from './fuzzy';

describe('fuzzyScore', () => {
  it('returns 0 when query chars are not all present in order', () => {
    expect(fuzzyScore('xyz', 'gpt-4o')).toBe(0);
    expect(fuzzyScore('opus', 'sonnet')).toBe(0);
  });

  it('returns 0 when chars appear but out of order', () => {
    expect(fuzzyScore('og', 'gpt-4o')).toBe(0);
  });

  it('matches case-insensitively', () => {
    expect(fuzzyScore('GPT', 'gpt-4o')).toBeGreaterThan(0);
    expect(fuzzyScore('gpt', 'GPT-4o')).toBeGreaterThan(0);
  });

  it('matches a contiguous prefix', () => {
    expect(fuzzyScore('gpt', 'gpt-4o-mini')).toBeGreaterThan(0);
  });

  it('matches non-contiguous subsequences', () => {
    expect(fuzzyScore('gpt4o', 'gpt-4o-mini')).toBeGreaterThan(0);
    expect(fuzzyScore('c35s', 'claude-3-5-sonnet')).toBeGreaterThan(0);
  });

  it('does not match when chars appear but only before earlier query chars', () => {
    // 'cs35s' requires c, then s, then 3 — but in 'claude-3-5-sonnet' the
    // first 's' is in 'sonnet', past 3 and 5, so 3/5 can no longer match.
    expect(fuzzyScore('cs35s', 'claude-3-5-sonnet')).toBe(0);
  });

  it('returns empty-query score of 0 (no matched chars contribute)', () => {
    expect(fuzzyScore('', 'anything')).toBe(0);
  });

  it('scores contiguous matches higher than scattered ones', () => {
    const contiguous = fuzzyScore('mini', 'gpt-4o-mini');
    const scattered = fuzzyScore('mini', 'momentum-inertia-noise-index');
    expect(contiguous).toBeGreaterThan(scattered);
  });

  it('rewards word-boundary starts', () => {
    // 's' at the start of a word vs mid-word
    const boundary = fuzzyScore('s', 'gpt-sonnet');
    const midWord = fuzzyScore('s', 'gptsonnet');
    expect(boundary).toBeGreaterThan(midWord);
  });

  it('rewards matching at the very start of the target', () => {
    const atStart = fuzzyScore('g', 'gpt-4o');
    const inMiddle = fuzzyScore('g', 'xg');
    expect(atStart).toBeGreaterThan(inMiddle);
  });

  it('treats . / _ - : and space as word boundaries', () => {
    for (const sep of ['.', '/', '_', '-', ':', ' ']) {
      const target = `a${sep}b`;
      expect(fuzzyScore('b', target)).toBeGreaterThan(fuzzyScore('b', 'ab'));
    }
  });

  it('ranks closer matches higher in a realistic model list', () => {
    const candidates = [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-3.5-turbo',
      'claude-3-5-sonnet',
      'gemini-1.5-pro',
    ];
    const ranked = candidates
      .map((c) => ({ c, s: fuzzyScore('gpt4o', c) }))
      .filter((x) => x.s > 0)
      // Same ordering the ProviderPicker applies: score desc, shorter target wins ties.
      .sort((a, b) => b.s - a.s || a.c.length - b.c.length)
      .map((x) => x.c);
    expect(ranked[0]).toBe('gpt-4o');
    expect(ranked).toContain('gpt-4o-mini');
    expect(ranked).not.toContain('claude-3-5-sonnet');
  });

  it('returns a positive score for any successful match', () => {
    expect(fuzzyScore('a', 'a')).toBeGreaterThan(0);
    expect(fuzzyScore('abc', 'abc')).toBeGreaterThan(0);
  });
});
