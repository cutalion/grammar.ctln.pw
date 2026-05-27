import { ProviderConfig } from '../providers/types';
import { ThemeMode } from '../lib/theme';

const KEY = 'grammar.settings.v1';

export interface Settings {
  configs: ProviderConfig[];
  activeConfigId: string | null;
  systemPrompt?: string;
  theme?: ThemeMode;
}

const empty: Settings = { configs: [], activeConfigId: null };

function normalizeTheme(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Settings;
    return {
      configs: parsed.configs ?? [],
      activeConfigId: parsed.activeConfigId ?? null,
      systemPrompt: parsed.systemPrompt,
      theme: normalizeTheme(parsed.theme),
    };
  } catch {
    return empty;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
