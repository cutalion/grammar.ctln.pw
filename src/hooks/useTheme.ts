import { useEffect } from 'react';
import { applyTheme, ThemeMode } from '../lib/theme';

// Applies the chosen theme to <html>. While the mode is `system`, a
// matchMedia listener re-applies on live OS theme changes so the OS
// preference still wins by default. Explicit light/dark ignore the OS.
export function useTheme(mode: ThemeMode) {
  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);
}
