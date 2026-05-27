export type ThemeMode = 'system' | 'light' | 'dark';

export function resolveTheme(
  mode: ThemeMode,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

export function applyTheme(mode: ThemeMode): void {
  const prefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches;
  const effective = resolveTheme(mode, prefersDark);
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  root.style.colorScheme = effective;
}
