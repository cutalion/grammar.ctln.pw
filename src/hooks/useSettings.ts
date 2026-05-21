import { useEffect, useState } from 'react';
import { loadSettings, saveSettings, Settings } from '../storage/settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  useEffect(() => { saveSettings(settings); }, [settings]);
  return [settings, setSettings] as const;
}
