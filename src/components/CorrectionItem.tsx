import { useEffect, useRef, useState } from "react";
import { Correction } from "../storage/corrections";
import { hasMeaningfulDiff, wordDiff } from "../lib/diff";

interface Props {
  item: Correction;
  onDelete: (id: string) => void;
}

type CopiedKind = "corrected" | "original";

export function CorrectionItem({ item, onDelete }: Props) {
  const [showDiff, setShowDiff] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState<CopiedKind | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDone = item.status === "done";
  const canDiff = isDone && hasMeaningfulDiff(item.input, item.output);
  // While pending or errored, the original is the only context the user has, so
  // always show it. When done, defer to the explicit toggle (and only in clean
  // mode — diff already represents the original via strikethroughs).
  const inCleanWithChanges = isDone && canDiff && !showDiff;
  const renderOriginal =
    item.status === "pending" ||
    item.status === "error" ||
    (inCleanWithChanges && showOriginal);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copy = (kind: CopiedKind) => {
    const text = kind === "corrected" ? item.output : item.input;
    if (!text) return;
    void navigator.clipboard?.writeText(text);
    setCopied(kind);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), 1500);
  };

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-gh-border-muted dark:bg-gh-surface">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-500 dark:border-gh-border-muted dark:bg-gh-canvas">
        <span className="truncate">{item.model && <>{item.model} · </>}</span>
        <div className="flex shrink-0 gap-3">
          {canDiff && (
            <button
              onClick={() => setShowDiff((v) => !v)}
              className="hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              {showDiff ? "Show clean" : "Show changes"}
            </button>
          )}
          {inCleanWithChanges && (
            <button
              onClick={() => setShowOriginal((v) => !v)}
              className="hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              {showOriginal ? "Hide original" : "Show original"}
            </button>
          )}
          {item.input && (
            <button
              onClick={() => copy("original")}
              className="hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              {copied === "original" ? "Copied!" : "Copy original"}
            </button>
          )}
          {isDone && (
            <button
              onClick={() => copy("corrected")}
              className="hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              {copied === "corrected" ? "Copied!" : "Copy corrected"}
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        {item.status === "pending" && (
          <div className="text-sm italic text-neutral-400">Correcting…</div>
        )}
        {item.status === "error" && (
          <div className="text-sm text-red-600">{item.error}</div>
        )}
        {isDone &&
          (canDiff && showDiff ? (
            <DiffView a={item.input} b={item.output} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm">
              {item.output}
            </pre>
          ))}
        {isDone && !canDiff && (
          <div className="mt-1 text-[11px] italic text-neutral-400">
            No changes
          </div>
        )}
      </div>

      {renderOriginal && (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-gh-border-muted dark:bg-gh-canvas">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Original
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm text-neutral-600 dark:text-neutral-400">
            {item.input}
          </pre>
        </div>
      )}

      {isDone && item.notes && (
        <div className="border-t border-amber-200/60 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Notes
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-amber-900 dark:text-amber-100">
            {item.notes}
          </pre>
        </div>
      )}
    </article>
  );
}

function DiffView({ a, b }: { a: string; b: string }) {
  const parts = wordDiff(a, b);
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm">
      {parts.map((p, i) => {
        if (p.type === "same") return <span key={i}>{p.text}</span>;
        if (p.type === "add") {
          return (
            <span
              key={i}
              className="rounded bg-green-200/70 px-0.5 dark:bg-[#3fb950]/40 dark:text-[#aff5b4]"
            >
              {p.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="rounded bg-red-200/70 px-0.5 line-through decoration-red-700/60 dark:bg-[#f85149]/40 dark:text-[#ffdcd7] dark:decoration-[#ffdcd7]/70"
          >
            {p.text}
          </span>
        );
      })}
    </pre>
  );
}
