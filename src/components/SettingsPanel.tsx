import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Settings } from "../storage/settings";
import { ProviderConfig, ProviderId } from "../providers/types";
import { adapters } from "../providers";
import { shortId } from "../lib/id";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt";
import { Icon, IconButton, faPen, faTrash, faXmark } from "./Icon";

const AUTOLOAD_DEBOUNCE_MS = 600;

interface Props {
  settings: Settings;
  onChange: Dispatch<SetStateAction<Settings>>;
  onClose: () => void;
  historyCount: number;
  onClearHistory: () => void;
}

interface ModelsState {
  loading?: boolean;
  error?: string;
}

export function SettingsPanel({
  settings,
  onChange,
  onClose,
  historyCount,
  onClearHistory,
}: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [modelsByConfig, setModelsByConfig] = useState<
    Record<string, ModelsState>
  >({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(settings.configs.filter((c) => !c.apiKey).map((c) => c.id)),
  );
  const usedProviderIds = new Set(draft.configs.map((c) => c.providerId));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = (providerId: ProviderId) => {
    if (usedProviderIds.has(providerId)) return;
    const adapter = adapters[providerId];
    const cfg: ProviderConfig = {
      id: shortId(),
      providerId,
      label: adapter.label,
      apiKey: "",
      model: adapter.defaultModel,
      baseURL: providerId === "openai-compatible" ? "https://" : undefined,
    };
    setDraft({
      ...draft,
      configs: [...draft.configs, cfg],
    });
    setExpandedIds((s) => new Set(s).add(cfg.id));
  };

  const reconcileModel = (
    current: string,
    defaultModel: string,
    list: string[],
  ) => {
    if (list.length === 0) return current;
    if (list.includes(current)) return current;
    if (list.includes(defaultModel)) return defaultModel;
    return list[0];
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
    setModelsByConfig((m) => ({ ...m, [cfg.id]: { loading: true } }));
    try {
      const list = await adapters[cfg.providerId].listModels(cfg);
      setModelsByConfig((m) => ({ ...m, [cfg.id]: { loading: false } }));
      const fetchedAt = Date.now();
      const defaultModel = adapters[cfg.providerId].defaultModel;
      const patch = (c: ProviderConfig) =>
        c.id === cfg.id
          ? {
              ...c,
              models: list,
              modelsFetchedAt: fetchedAt,
              model: reconcileModel(c.model, defaultModel, list),
            }
          : c;
      setDraft((d) => ({ ...d, configs: d.configs.map(patch) }));
      // Commit immediately so the cache survives even if the user cancels
      // unrelated edits in this panel session. Use the functional setter form
      // — concurrent loads against different configs must not clobber each
      // other via stale closure captures.
      onChange((prev) => ({ ...prev, configs: prev.configs.map(patch) }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setModelsByConfig((m) => ({
        ...m,
        [cfg.id]: { loading: false, error: msg },
      }));
    }
  };

  // Auto-load models when credentials change. Debounced so typing/pasting a key
  // doesn't fire on every keystroke. Keyed on (apiKey, baseURL) — re-fires only
  // when those change, not on unrelated edits like label.
  const autoLoadSigRef = useRef<Record<string, string>>({});
  const autoLoadTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  useEffect(() => {
    for (const c of draft.configs) {
      if (!c.apiKey) continue;
      if (c.providerId === "openai-compatible") {
        if (!c.baseURL || !/^https?:\/\/.+/.test(c.baseURL)) continue;
      }
      const sig = `${c.apiKey}|${c.baseURL ?? ""}`;
      if (autoLoadSigRef.current[c.id] === sig) continue;

      if (autoLoadTimersRef.current[c.id]) {
        clearTimeout(autoLoadTimersRef.current[c.id]);
      }
      const cfg = c;
      autoLoadTimersRef.current[cfg.id] = setTimeout(() => {
        autoLoadSigRef.current[cfg.id] = sig;
        void loadModels(cfg);
      }, AUTOLOAD_DEBOUNCE_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.configs
      .map((c) => `${c.id}|${c.apiKey}|${c.baseURL ?? ""}`)
      .join("\n"),
  ]);

  useEffect(
    () => () => {
      for (const t of Object.values(autoLoadTimersRef.current)) clearTimeout(t);
    },
    [],
  );

  const save = () => {
    const configs = draft.configs.filter((c) => c.apiKey.trim().length > 0);
    const activeConfigId =
      draft.activeConfigId && configs.some((c) => c.id === draft.activeConfigId)
        ? draft.activeConfigId
        : null;
    onChange({ ...draft, configs, activeConfigId });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-screen w-full flex-col overflow-hidden rounded-none bg-white shadow-xl dark:bg-gh-surface sm:max-w-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-gh-border-muted">
          <h2 className="text-lg font-semibold">Settings</h2>
          <IconButton
            icon={faXmark}
            label="Close"
            variant="ghost"
            onClick={onClose}
          />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold">Providers</h3>
          {draft.configs.length === 0 && (
            <p className="text-sm text-neutral-500">
              Add a provider to get started. API keys are stored only in this
              browser's localStorage and sent directly to the provider.
            </p>
          )}
          {draft.configs.map((c) => {
            const models = modelsByConfig[c.id];
            const expanded = expandedIds.has(c.id);
            return (
              <div
                key={c.id}
                className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-gh-border-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  {expanded ? (
                    <input
                      value={c.label}
                      onChange={(e) => update(c.id, { label: e.target.value })}
                      className="min-w-0 flex-1 bg-transparent font-medium focus:underline focus:outline-none"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {c.label}
                    </span>
                  )}
                  <div className="flex shrink-0 items-center gap-2">
                    {!expanded && (
                      <IconButton
                        icon={faPen}
                        label="Edit"
                        variant="ghost"
                        iconSize="xs"
                        onClick={() => toggleExpanded(c.id)}
                      />
                    )}
                    {expanded && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(c.id)}
                        className="text-xs opacity-60 hover:opacity-100"
                      >
                        Collapse
                      </button>
                    )}
                    <IconButton
                      icon={faTrash}
                      label="Remove provider"
                      variant="ghost"
                      iconSize="xs"
                      onClick={() => remove(c.id)}
                    />
                  </div>
                </div>
                {expanded ? (
                  <div className="text-xs text-neutral-500">
                    {adapters[c.providerId].label}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <span>{adapters[c.providerId].label}</span>
                    <span className="opacity-60">·</span>
                    <span>{c.apiKey ? "key set" : "no key"}</span>
                    {c.models && c.models.length > 0 && (
                      <>
                        <span className="opacity-60">·</span>
                        <span>
                          {c.models.length} model
                          {c.models.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {expanded && (
                  <>
                    <Field
                      label="API key"
                      accessory={
                        adapters[c.providerId].apiKeyUrl ? (
                          <a
                            href={adapters[c.providerId].apiKeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
                          >
                            Get key ↗
                          </a>
                        ) : null
                      }
                    >
                      <input
                        type="password"
                        value={c.apiKey}
                        onChange={(e) =>
                          update(c.id, { apiKey: e.target.value })
                        }
                        className="input"
                        autoComplete="off"
                      />
                    </Field>

                    {c.providerId === "openai-compatible" && (
                      <Field label="Base URL">
                        <input
                          value={c.baseURL ?? ""}
                          onChange={(e) =>
                            update(c.id, { baseURL: e.target.value })
                          }
                          className="input"
                          placeholder="https://api.example.com/v1"
                        />
                      </Field>
                    )}

                    <Field label="Models">
                      <div className="text-[11px] text-neutral-500">
                        {models?.loading
                          ? "Loading…"
                          : !c.apiKey
                            ? "Enter an API key to load models."
                            : c.models
                              ? `${c.models.length} model${c.models.length === 1 ? "" : "s"} available${
                                  c.modelsFetchedAt
                                    ? ` · fetched ${new Date(c.modelsFetchedAt).toLocaleString()}`
                                    : ""
                                } · pick one in the top bar.`
                              : "Loading…"}
                      </div>
                      {models?.error && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-red-600">
                            {models.error}
                          </span>
                          <button
                            type="button"
                            onClick={() => loadModels(c)}
                            className="rounded-md border border-neutral-300 px-2 py-0.5 text-[11px] hover:bg-neutral-100 dark:border-gh-border dark:hover:bg-gh-overlay"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </Field>
                  </>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-2">
            {(Object.keys(adapters) as ProviderId[])
              .filter((id) => !usedProviderIds.has(id))
              .map((id) => (
                <button
                  key={id}
                  onClick={() => add(id)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-gh-border dark:hover:bg-gh-overlay"
                >
                  + {adapters[id].label}
                </button>
              ))}
          </div>

          <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-gh-border-muted">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">System prompt</h3>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, systemPrompt: undefined })}
                disabled={draft.systemPrompt === undefined}
                className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-gh-border dark:hover:bg-gh-overlay"
                title="Restore the built-in default prompt"
              >
                Restore default
              </button>
            </div>
            <textarea
              value={draft.systemPrompt ?? SYSTEM_PROMPT}
              onChange={(e) =>
                setDraft({ ...draft, systemPrompt: e.target.value })
              }
              rows={10}
              className="input font-mono text-xs"
              spellCheck={false}
            />
            <div className="text-[10px] text-neutral-400">
              {draft.systemPrompt === undefined
                ? "Using built-in default."
                : "Custom prompt active. The model is expected to wrap output in <corrected>…</corrected> and optional <notes>…</notes> tags."}
            </div>
          </div>

          <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-gh-border-muted">
            <h3 className="text-sm font-semibold">History</h3>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-neutral-500">
                {historyCount === 0
                  ? "No saved corrections."
                  : `${historyCount} correction${historyCount === 1 ? "" : "s"} saved in this browser.`}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (historyCount === 0) return;
                  if (confirm("Clear all corrections?")) {
                    onClearHistory();
                    onClose();
                  }
                }}
                disabled={historyCount === 0}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-gh-border dark:hover:bg-gh-overlay"
              >
                <Icon icon={faTrash} />
                Clear history
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4 dark:border-gh-border-muted">
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

function Field({
  label,
  children,
  accessory,
}: {
  label: string;
  children: ReactNode;
  accessory?: ReactNode;
}) {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center justify-between text-neutral-500">
        <span>{label}</span>
        {accessory}
      </div>
      {children}
    </div>
  );
}
