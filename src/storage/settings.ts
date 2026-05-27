import { ProviderConfig } from '../providers/types';
import { ThemeMode } from '../lib/theme';

const KEY = 'grammar.settings.v1';

export interface Settings {
  configs: ProviderConfig[];
  activeConfigId: string | null;
  systemPrompt?: string;
  theme?: ThemeMode;
}

// Fresh object per call — never hand out a shared mutable default that
// callers (or React's state initialiser) could alias.
function emptySettings(): Settings {
  return { configs: [], activeConfigId: null };
}

function normalizeTheme(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySettings();
    const parsed = JSON.parse(raw) as Settings;
    return {
      configs: parsed.configs ?? [],
      activeConfigId: parsed.activeConfigId ?? null,
      systemPrompt: parsed.systemPrompt,
      theme: normalizeTheme(parsed.theme),
    };
  } catch {
    return emptySettings();
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

// The active config, falling back to the first one when no id matches (or the
// stored id is stale). Shared so App and the picker can't drift apart.
export function getActiveConfig(s: Settings): ProviderConfig | undefined {
  return s.configs.find((c) => c.id === s.activeConfigId) ?? s.configs[0];
}
