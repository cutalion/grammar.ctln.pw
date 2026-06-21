import { describe, expect, it } from 'vitest';
import { parseOutput } from './parseOutput';

describe('parseOutput', () => {
  it('extracts corrected text and notes', () => {
    const raw = `<corrected>
Hello world.
</corrected>
<notes>
- Capitalised the first word
</notes>`;
    expect(parseOutput(raw)).toEqual({
      corrected: 'Hello world.',
      notes: '- Capitalised the first word',
    });
  });

  it('returns corrected text with no notes when the notes block is absent', () => {
    const raw = '<corrected>Fixed text.</corrected>';
    expect(parseOutput(raw)).toEqual({ corrected: 'Fixed text.' });
  });

  it('treats an empty notes block as no notes', () => {
    const raw = '<corrected>Fixed.</corrected>\n<notes>\n\n</notes>';
    expect(parseOutput(raw)).toEqual({ corrected: 'Fixed.' });
  });

  it('falls back to the raw response when <corrected> is missing', () => {
    const raw = 'Just the corrected text, no tags.';
    expect(parseOutput(raw)).toEqual({ corrected: 'Just the corrected text, no tags.' });
  });

  it('trims surrounding whitespace in the fallback path', () => {
    expect(parseOutput('  spaced out  ')).toEqual({ corrected: 'spaced out' });
  });

  it('is case-insensitive on the tag names', () => {
    const raw = '<Corrected>Hi.</Corrected><Notes>- bullet</Notes>';
    expect(parseOutput(raw)).toEqual({ corrected: 'Hi.', notes: '- bullet' });
  });

  it('finds notes regardless of order relative to corrected', () => {
    const raw = '<notes>- did a thing</notes><corrected>Done.</corrected>';
    expect(parseOutput(raw)).toEqual({ corrected: 'Done.', notes: '- did a thing' });
  });

  it('preserves internal newlines and multi-line content', () => {
    const raw = '<corrected>line one\nline two</corrected>';
    expect(parseOutput(raw)).toEqual({ corrected: 'line one\nline two' });
  });

  it('extracts suggested text and notes when given the suggested tag', () => {
    const raw = `<suggested>
I went to the store.
</suggested>
<notes>
- "to the store" is the natural collocation
</notes>`;
    expect(parseOutput(raw, 'suggested')).toEqual({
      corrected: 'I went to the store.',
      notes: '- "to the store" is the natural collocation',
    });
  });

  it('falls back to raw text when the suggested tag is missing', () => {
    expect(parseOutput('no tags here', 'suggested')).toEqual({
      corrected: 'no tags here',
    });
  });

  it('does not match the corrected tag when asked for the suggested tag', () => {
    const raw = '<corrected>grammar only</corrected>';
    expect(parseOutput(raw, 'suggested')).toEqual({
      corrected: '<corrected>grammar only</corrected>',
    });
  });
});
