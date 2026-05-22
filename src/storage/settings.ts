import { ProviderConfig } from '../providers/types';

const KEY = 'grammar.settings.v1';

export interface Settings {
  configs: ProviderConfig[];
  activeConfigId: string | null;
  systemPrompt?: string;
}

const empty: Settings = { configs: [], activeConfigId: null };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Settings;
    return {
      configs: parsed.configs ?? [],
      activeConfigId: parsed.activeConfigId ?? null,
      systemPrompt: parsed.systemPrompt,
    };
  } catch {
    return empty;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
