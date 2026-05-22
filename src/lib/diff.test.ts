import { describe, expect, it } from 'vitest';
import { hasMeaningfulDiff, normalizeForDiff, wordDiff, type DiffPart } from './diff';

// Helpers for readable assertions.
const sameText = (parts: DiffPart[]) =>
  parts.filter((p) => p.type === 'same').map((p) => p.text).join('');
const addText = (parts: DiffPart[]) =>
  parts.filter((p) => p.type === 'add').map((p) => p.text).join('');
const delText = (parts: DiffPart[]) =>
  parts.filter((p) => p.type === 'del').map((p) => p.text).join('');
const reconstructAdded = (parts: DiffPart[]) =>
  parts.filter((p) => p.type !== 'del').map((p) => p.text).join('');
const reconstructDeleted = (parts: DiffPart[]) =>
  parts.filter((p) => p.type !== 'add').map((p) => p.text).join('');

describe('normalizeForDiff', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizeForDiff('  hello  ')).toBe('hello');
  });

  it('collapses runs of spaces and tabs but preserves newlines', () => {
    expect(normalizeForDiff('a   b\t\tc')).toBe('a b c');
    expect(normalizeForDiff('para 1\n\npara 2')).toBe('para 1\n\npara 2');
    expect(normalizeForDiff('a \t  b\n  c')).toBe('a b\n c');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeForDiff('   \t\n  ')).toBe('');
  });
});

describe('hasMeaningfulDiff', () => {
  it('is false when texts are identical', () => {
    expect(hasMeaningfulDiff('hello world', 'hello world')).toBe(false);
  });

  it('is false when only whitespace differs', () => {
    expect(hasMeaningfulDiff('hello  world', 'hello world')).toBe(false);
    expect(hasMeaningfulDiff('  hello world  ', 'hello world')).toBe(false);
  });

  it('is true when content changes', () => {
    expect(hasMeaningfulDiff('hello world', 'hello there')).toBe(true);
  });

  it('is true when paragraph breaks change', () => {
    expect(hasMeaningfulDiff('a b c', 'a\n\nb c')).toBe(true);
  });
});

describe('wordDiff — identity & trivial cases', () => {
  it('marks identical text entirely as same', () => {
    const parts = wordDiff('hello world', 'hello world');
    expect(parts.every((p) => p.type === 'same')).toBe(true);
    expect(sameText(parts)).toBe('hello world');
  });

  it('handles both sides empty', () => {
    expect(wordDiff('', '')).toEqual([]);
  });

  it('handles empty original (pure insertion)', () => {
    const parts = wordDiff('', 'hello');
    expect(delText(parts)).toBe('');
    expect(addText(parts)).toBe('hello');
  });

  it('handles empty correction (pure deletion)', () => {
    const parts = wordDiff('hello', '');
    expect(delText(parts)).toBe('hello');
    expect(addText(parts)).toBe('');
  });
});

describe('wordDiff — word-level substitution', () => {
  it('flags a single substituted word', () => {
    const parts = wordDiff('I like cats', 'I like dogs');
    expect(sameText(parts).replace(/\s+/g, ' ').trim()).toBe('I like');
    expect(delText(parts)).toBe('cats');
    expect(addText(parts)).toBe('dogs');
  });

  it('handles a word inserted in the middle', () => {
    const parts = wordDiff('I like cats', 'I really like cats');
    expect(addText(parts)).toBe('really');
    expect(delText(parts)).toBe('');
  });

  it('handles a word removed from the middle', () => {
    const parts = wordDiff('I really like cats', 'I like cats');
    expect(delText(parts)).toBe('really');
    expect(addText(parts)).toBe('');
  });

  it('reconstructs both sides token-by-token', () => {
    const a = 'their sites are slow';
    const b = 'these sites are slow';
    const parts = wordDiff(a, b);
    expect(reconstructDeleted(parts)).toBe(a);
    expect(reconstructAdded(parts)).toBe(b);
  });
});

describe('wordDiff — punctuation handled separately from words', () => {
  it('changing "." to "?" keeps the word as a shared anchor', () => {
    const parts = wordDiff('apps.', 'apps?');
    expect(sameText(parts)).toBe('apps');
    expect(delText(parts)).toBe('.');
    expect(addText(parts)).toBe('?');
  });

  it('does not drag a word across a paragraph break when only its punctuation changes', () => {
    const a = 'helper apps.\n\nI often use AI';
    const b = 'helper apps?\n\nI often use AI';
    const parts = wordDiff(a, b);

    // Reconstructing each side must yield the original input verbatim. If the
    // diff were to "move" the word `apps` across the paragraph break, the
    // reconstruction would still match — but the *position* of the del/add
    // markers tells us the diff is local. Assert both: reconstruction round-
    // trips, AND the del/add chips are the punctuation only.
    expect(reconstructDeleted(parts)).toBe(a);
    expect(reconstructAdded(parts)).toBe(b);
    expect(delText(parts)).toBe('.');
    expect(addText(parts)).toBe('?');

    // And the index of the del must come before the paragraph break, not after.
    const delIdx = parts.findIndex((p) => p.type === 'del');
    const breakIdx = parts.findIndex((p) => p.type === 'same' && /\n\n/.test(p.text));
    expect(delIdx).toBeGreaterThanOrEqual(0);
    expect(breakIdx).toBeGreaterThanOrEqual(0);
    expect(delIdx).toBeLessThan(breakIdx);
  });

  it('treats added punctuation as an addition only', () => {
    const parts = wordDiff('hi world', 'hi, world');
    expect(addText(parts)).toBe(',');
    expect(delText(parts)).toBe('');
  });

  it('treats removed punctuation as a deletion only', () => {
    const parts = wordDiff('hi, world', 'hi world');
    expect(delText(parts)).toBe(',');
    expect(addText(parts)).toBe('');
  });

  it('splits hyphenated words at the hyphen', () => {
    const parts = wordDiff('vibe-coded helper', 'vibecoded helper');
    expect(reconstructDeleted(parts)).toBe('vibe-coded helper');
    expect(reconstructAdded(parts)).toBe('vibecoded helper');
  });
});

describe('wordDiff — whitespace handling', () => {
  it('does not emit del chips for pure whitespace', () => {
    const parts = wordDiff('hello  world', 'hello world');
    // No del parts at all — whitespace-only deletions are suppressed.
    expect(parts.some((p) => p.type === 'del')).toBe(false);
  });

  it('promotes added whitespace to "same" so layout reflects the correction', () => {
    const parts = wordDiff('hello world', 'hello  world');
    expect(parts.some((p) => p.type === 'add')).toBe(false);
    // The corrected double-space is rendered as same so the reader sees it.
    expect(sameText(parts)).toContain('  ');
  });

  it('preserves paragraph breaks in same parts', () => {
    const a = 'para one\n\npara two';
    const b = 'para one\n\npara two';
    const parts = wordDiff(a, b);
    expect(sameText(parts)).toBe(a);
  });

  it('emits no whitespace-only del/add chips even when both sides differ in whitespace', () => {
    const parts = wordDiff('a   b', 'a\tb');
    for (const p of parts) {
      if (p.type === 'add' || p.type === 'del') {
        expect(/^\s+$/.test(p.text)).toBe(false);
      }
    }
  });
});

describe('wordDiff — multi-edit & realistic prose', () => {
  it('handles multiple independent edits in one pass', () => {
    const a = 'their sites are becoming slow and inconvenient';
    const b = 'these sites are becoming sluggish and inconvenient';
    const parts = wordDiff(a, b);
    expect(delText(parts)).toContain('their');
    expect(delText(parts)).toContain('slow');
    expect(addText(parts)).toContain('these');
    expect(addText(parts)).toContain('sluggish');
    expect(reconstructDeleted(parts)).toBe(a);
    expect(reconstructAdded(parts)).toBe(b);
  });

  it('round-trips a multi-paragraph correction faithfully', () => {
    const a =
      'Did you know that Chrome and FF now both have a split view? And that this is a good place for your vibecoded helper apps.\n\nI often use AI to correct my English grammar.';
    const b =
      'Did you know that Chrome and FF now both have a split view? And that this is a good place for your vibecoded helper apps?\n\nI often use AI to correct my English grammar.';
    const parts = wordDiff(a, b);
    expect(reconstructDeleted(parts)).toBe(a);
    expect(reconstructAdded(parts)).toBe(b);
    // Only the trailing punctuation of "apps" should be flagged.
    expect(delText(parts)).toBe('.');
    expect(addText(parts)).toBe('?');
  });
});

describe('wordDiff — non-ASCII scripts', () => {
  it('keeps Cyrillic words intact instead of splitting them per character', () => {
    const parts = wordDiff('привет мир', 'привет, мир');
    // The word "привет" must survive as a single same-token, with only the
    // comma as an addition.
    expect(sameText(parts)).toContain('привет');
    expect(sameText(parts)).toContain('мир');
    expect(addText(parts)).toBe(',');
    expect(delText(parts)).toBe('');
  });

  it('handles a Cyrillic word substitution as a whole-word swap', () => {
    const parts = wordDiff('привет мир', 'здравствуй мир');
    expect(delText(parts)).toBe('привет');
    expect(addText(parts)).toBe('здравствуй');
  });
});
