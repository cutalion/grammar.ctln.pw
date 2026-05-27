import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('resolves system to dark when the OS prefers dark', () => {
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('resolves system to light when the OS does not prefer dark', () => {
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('returns the explicit mode regardless of OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
  });
});
