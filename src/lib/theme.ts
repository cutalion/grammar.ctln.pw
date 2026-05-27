export type ThemeMode = 'system' | 'light' | 'dark';

export function resolveTheme(
  mode: ThemeMode,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}
