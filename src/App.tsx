import { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import { useCorrections } from './hooks/useCorrections';
import { Composer } from './components/Composer';
import { CorrectionItem } from './components/CorrectionItem';
import { SettingsPanel } from './components/SettingsPanel';
import { ProviderPicker } from './components/ProviderPicker';

export default function App() {
  const [settings, setSettings] = useSettings();
  const { items, correct, remove, clear } = useCorrections();
  const [showSettings, setShowSettings] = useState(false);

  const activeConfig =
    settings.configs.find((c) => c.id === settings.activeConfigId) ?? settings.configs[0];

  const handleSubmit = (text: string) => {
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }
    void correct(text, activeConfig);
  };

  const reversed = [...items].reverse();

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="flex-1 text-sm font-semibold">grammar.ctln.pw</h1>
        <ProviderPicker
          settings={settings}
          onChange={(id) => setSettings({ ...settings, activeConfigId: id })}
          onOpenSettings={() => setShowSettings(true)}
        />
        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all corrections?')) clear();
            }}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            Clear
          </button>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          Settings
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="sticky top-0 -mx-3 bg-neutral-50/90 px-3 py-1 backdrop-blur dark:bg-neutral-950/90 sm:-mx-4 sm:px-4">
            <Composer onSubmit={handleSubmit} disabled={!activeConfig} />
            {!activeConfig && (
              <div className="pt-2 text-center text-xs text-neutral-500">
                Add a provider in{' '}
                <button onClick={() => setShowSettings(true)} className="underline">
                  Settings
                </button>{' '}
                to get started.
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="pt-8 text-center text-sm text-neutral-500">
              Paste or type text above to correct it. Each correction is saved locally.
            </div>
          ) : (
            reversed.map((item) => (
              <CorrectionItem key={item.id} item={item} onDelete={remove} />
            ))
          )}
        </div>
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
