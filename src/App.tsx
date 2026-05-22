import { useEffect, useRef, useState } from 'react';
import { useSettings } from './hooks/useSettings';
import { useCorrections } from './hooks/useCorrections';
import { Composer } from './components/Composer';
import { CorrectionItem } from './components/CorrectionItem';
import { SettingsPanel } from './components/SettingsPanel';
import { ProviderPicker } from './components/ProviderPicker';
import { Icon, IconButton, faArrowUp, faGear } from './components/Icon';
import { adapters } from './providers';

const MODELS_STALE_MS = 24 * 60 * 60 * 1000;

export default function App() {
  const [settings, setSettings] = useSettings();
  const { items, correct, remove, clear } = useCorrections();
  const [showSettings, setShowSettings] = useState(false);
  const [composerOutOfView, setComposerOutOfView] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const activeConfig =
    settings.configs.find((c) => c.id === settings.activeConfigId) ?? settings.configs[0];

  useEffect(() => {
    if (!composerRef.current || !mainRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setComposerOutOfView(!entry.isIntersecting),
      { root: mainRef.current, threshold: 0 },
    );
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (text: string) => {
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }
    void correct(text, activeConfig, settings.systemPrompt);
  };

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reversed = [...items].reverse();

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-end gap-2 border-b border-neutral-200 bg-white px-3 py-2 dark:border-gh-border-muted dark:bg-gh-surface">
        <ProviderPicker
          settings={settings}
          onSelect={(configId, model) => {
            setSettings({
              ...settings,
              activeConfigId: configId,
              configs: settings.configs.map((c) =>
                c.id === configId ? { ...c, model } : c,
              ),
            });
            const cfg = settings.configs.find((c) => c.id === configId);
            if (!cfg || !cfg.apiKey) return;
            const stale = !cfg.modelsFetchedAt || Date.now() - cfg.modelsFetchedAt > MODELS_STALE_MS;
            if (!stale) return;
            void adapters[cfg.providerId]
              .listModels(cfg)
              .then((list) => {
                const defaultModel = adapters[cfg.providerId].defaultModel;
                setSettings((prev) => ({
                  ...prev,
                  configs: prev.configs.map((c) => {
                    if (c.id !== cfg.id) return c;
                    const nextModel =
                      list.length === 0
                        ? c.model
                        : list.includes(c.model)
                          ? c.model
                          : list.includes(defaultModel)
                            ? defaultModel
                            : list[0];
                    return {
                      ...c,
                      models: list,
                      modelsFetchedAt: Date.now(),
                      model: nextModel,
                    };
                  }),
                }));
              })
              .catch(() => {
                // Silent — background refresh shouldn't disturb a selection that worked.
              });
          }}
          onOpenSettings={() => setShowSettings(true)}
        />
        <IconButton icon={faGear} label="Settings" onClick={() => setShowSettings(true)} />
      </header>

      <main ref={mainRef} className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <div ref={composerRef}>
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

        {composerOutOfView && (
          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="fixed bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-lg transition hover:bg-neutral-100 dark:border-gh-border dark:bg-gh-surface dark:hover:bg-gh-overlay"
            style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Icon icon={faArrowUp} size="lg" className="text-neutral-400" />
          </button>
        )}
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          historyCount={items.length}
          onClearHistory={clear}
        />
      )}
    </div>
  );
}
