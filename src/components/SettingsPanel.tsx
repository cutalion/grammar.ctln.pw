import { ReactNode, useState } from 'react';
import { Settings } from '../storage/settings';
import { ProviderConfig, ProviderId } from '../providers/types';
import { adapters } from '../providers';
import { shortId } from '../lib/id';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

interface ModelsState {
  list?: string[];
  loading?: boolean;
  error?: string;
}

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [modelsByConfig, setModelsByConfig] = useState<Record<string, ModelsState>>({});

  const add = (providerId: ProviderId) => {
    const adapter = adapters[providerId];
    const cfg: ProviderConfig = {
      id: shortId(),
      providerId,
      label: adapter.label,
      apiKey: '',
      model: adapter.defaultModel,
      baseURL: providerId === 'openai-compatible' ? 'https://' : undefined,
    };
    setDraft({
      configs: [...draft.configs, cfg],
      activeConfigId: draft.activeConfigId ?? cfg.id,
    });
  };

  const update = (id: string, patch: Partial<ProviderConfig>) => {
    setDraft({
      ...draft,
      configs: draft.configs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const remove = (id: string) => {
    setDraft({
      configs: draft.configs.filter((c) => c.id !== id),
      activeConfigId: draft.activeConfigId === id ? null : draft.activeConfigId,
    });
  };

  const loadModels = async (cfg: ProviderConfig) => {
    setModelsByConfig((m) => ({ ...m, [cfg.id]: { ...m[cfg.id], loading: true, error: undefined } }));
    try {
      const list = await adapters[cfg.providerId].listModels(cfg);
      setModelsByConfig((m) => ({ ...m, [cfg.id]: { list, loading: false } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setModelsByConfig((m) => ({ ...m, [cfg.id]: { ...m[cfg.id], loading: false, error: msg } }));
    }
  };

  const save = () => {
    onChange(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-20 flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-screen w-full flex-col overflow-hidden rounded-none bg-white shadow-xl dark:bg-neutral-900 sm:max-w-xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Providers</h2>
          <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100">
            Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {draft.configs.length === 0 && (
            <p className="text-sm text-neutral-500">
              Add a provider to get started. API keys are stored only in this browser's localStorage
              and sent directly to the provider.
            </p>
          )}
          {draft.configs.map((c) => {
            const models = modelsByConfig[c.id];
            const datalistId = `models-${c.id}`;
            return (
              <div
                key={c.id}
                className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <input
                    value={c.label}
                    onChange={(e) => update(c.id, { label: e.target.value })}
                    className="bg-transparent font-medium focus:underline focus:outline-none"
                  />
                  <button onClick={() => remove(c.id)} className="text-xs opacity-60 hover:opacity-100">
                    Remove
                  </button>
                </div>
                <div className="text-xs text-neutral-500">{adapters[c.providerId].label}</div>

                <Field label="API key">
                  <input
                    type="password"
                    value={c.apiKey}
                    onChange={(e) => update(c.id, { apiKey: e.target.value })}
                    className="input"
                    autoComplete="off"
                  />
                </Field>

                {c.providerId === 'openai-compatible' && (
                  <Field label="Base URL">
                    <input
                      value={c.baseURL ?? ''}
                      onChange={(e) => update(c.id, { baseURL: e.target.value })}
                      className="input"
                      placeholder="https://api.example.com/v1"
                    />
                  </Field>
                )}

                <Field label="Model">
                  <div className="flex gap-2">
                    <input
                      list={datalistId}
                      value={c.model}
                      onChange={(e) => update(c.id, { model: e.target.value })}
                      className="input"
                      placeholder={adapters[c.providerId].defaultModel}
                    />
                    <button
                      type="button"
                      onClick={() => loadModels(c)}
                      disabled={models?.loading}
                      className="shrink-0 rounded-md border border-neutral-300 px-2 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      title="Fetch available models from the provider"
                    >
                      {models?.loading ? '…' : models?.list ? 'Reload' : 'Load'}
                    </button>
                  </div>
                  {models?.list && (
                    <datalist id={datalistId}>
                      {models.list.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  )}
                  {models?.list && (
                    <div className="text-[10px] text-neutral-400">
                      {models.list.length} model{models.list.length === 1 ? '' : 's'} available
                    </div>
                  )}
                  {models?.error && <div className="text-[11px] text-red-600">{models.error}</div>}
                </Field>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-2">
            {(Object.keys(adapters) as ProviderId[]).map((id) => (
              <button
                key={id}
                onClick={() => add(id)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                + {adapters[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
          <button onClick={onClose} className="px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="text-neutral-500">{label}</div>
      {children}
    </div>
  );
}
