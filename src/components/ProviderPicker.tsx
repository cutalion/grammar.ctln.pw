import {
  CSSProperties,
  KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getActiveConfig, Settings } from "../storage/settings";
import { fuzzyScore } from "../lib/fuzzy";

interface Props {
  settings: Settings;
  onSelect: (configId: string, model: string) => void;
  onOpenSettings: () => void;
}

interface Option {
  configId: string;
  providerLabel: string;
  model: string;
}

export function ProviderPicker({ settings, onSelect, onOpenSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Start fixed (out of flow) and hidden: before the first `compute()` runs, an
  // unpositioned menu would be `position: static`, sit in normal flow, and widen
  // the `.relative` wrapper — shifting the trigger and corrupting the very
  // getBoundingClientRect() we measure against. `visibility: hidden` avoids a
  // flash at the pre-measurement spot until `compute()` sets the real offsets.
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });

  const allOptions = useMemo<Option[]>(() => {
    return settings.configs.flatMap((c) => {
      const models =
        c.models && c.models.length > 0 ? c.models : c.model ? [c.model] : [];
      return models.map((m) => ({
        configId: c.id,
        providerLabel: c.label,
        model: m,
      }));
    });
  }, [settings.configs]);

  const showProviderColumn = useMemo(
    () => new Set(allOptions.map((o) => o.configId)).size > 1,
    [allOptions],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return allOptions;
    const scored = allOptions
      .map((o) => {
        const modelScore = fuzzyScore(q, o.model);
        const labelScore = showProviderColumn
          ? fuzzyScore(q, o.providerLabel)
          : 0;
        return { o, score: Math.max(modelScore, labelScore) };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.o.model.length - b.o.model.length);
    return scored.map((s) => s.o);
  }, [allOptions, query, showProviderColumn]);

  const active = getActiveConfig(settings);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery("");
      // Pre-highlight the currently active option if present
      const idx = active
        ? filtered.findIndex(
            (o) => o.configId === active.id && o.model === active.model,
          )
        : -1;
      setHighlight(idx >= 0 ? idx : 0);
    }
    // We intentionally only react to `open` here — re-running on filter changes
    // would fight the user's keyboard navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const li = ul.children[highlight] as HTMLElement | undefined;
    li?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  // Position the menu with `fixed` so it can't be pushed off-screen by the
  // trigger's offset: align its right edge to the trigger when there's room,
  // but clamp so the left edge always stays within the viewport. Avoids
  // assuming the trigger sits near the right edge or hardcoding the header
  // height. Recomputed on open and on resize.
  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 8;
      const width = Math.min(320, window.innerWidth - margin * 2);
      let right = window.innerWidth - rect.right;
      right = Math.min(right, window.innerWidth - width - margin);
      right = Math.max(right, margin);
      setMenuStyle({ position: "fixed", top: rect.bottom + 4, right, width });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  if (allOptions.length === 0) {
    return (
      <button
        onClick={onOpenSettings}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-gh-border"
      >
        {settings.configs.length === 0 ? "Add provider" : "Pick model"}
      </button>
    );
  }

  const select = (o: Option) => {
    onSelect(o.configId, o.model);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) select(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="max-w-[14rem] truncate rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-gh-border"
        title={active?.model}
      >
        {active?.model || "Pick model"}
      </button>

      {open && (
        <div
          style={menuStyle}
          className="z-30 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-gh-border dark:bg-gh-surface"
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Filter ${allOptions.length} model${allOptions.length === 1 ? "" : "s"}…`}
            className="w-full border-b border-neutral-200 bg-transparent px-3 py-2 text-xs focus:outline-none dark:border-gh-border-muted"
          />
          <ul ref={listRef} className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-neutral-500">No matches</li>
            )}
            {filtered.map((o, i) => {
              const isActive =
                !!active &&
                o.configId === active.id &&
                o.model === active.model;
              const isHighlighted = i === highlight;
              return (
                <li
                  key={`${o.configId}::${o.model}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    // mousedown (not click) so we beat the outside-click handler
                    e.preventDefault();
                    select(o);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-xs ${
                    isHighlighted ? "bg-neutral-100 dark:bg-gh-overlay" : ""
                  }`}
                >
                  <span
                    className={`truncate ${isActive ? "font-semibold" : ""}`}
                  >
                    {isActive ? "✓ " : ""}
                    {o.model}
                  </span>
                  {showProviderColumn && (
                    <span className="shrink-0 text-[10px] text-neutral-400">
                      {o.providerLabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
