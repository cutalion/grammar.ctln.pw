import { useEffect, useRef, useState } from "react";
import { Correction } from "../storage/corrections";
import { hasMeaningfulDiff, wordDiff } from "../lib/diff";
import { IconButton, faCheck, faCopy, faTrash } from "./Icon";

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
  // always show it. When done, show it only when the user toggles it on.
  const canToggleOriginal = isDone && canDiff;
  const renderOriginal = !isDone || (canToggleOriginal && showOriginal);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copy = (kind: CopiedKind) => {
    const text = kind === "corrected" ? item.output : item.input;
    if (!text) return;
    // Only flash "Copied" once the write actually succeeds — otherwise the UI
    // would lie when the clipboard API is unavailable or permission is denied.
    const write = navigator.clipboard?.writeText(text);
    if (!write) return;
    void write
      .then(() => {
        setCopied(kind);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => {});
  };

  const actionRail = "flex w-6 shrink-0 justify-center";
  const actionIcon = { iconSize: "2xs" as const };

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-gh-border-muted dark:bg-gh-surface">
      <div className="flex border-b border-neutral-200 bg-neutral-50 dark:border-gh-border-muted dark:bg-gh-canvas">
        <header className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-1.5 text-[11px] text-neutral-500">
          <span className="truncate">{item.model}</span>
          <div className="flex shrink-0 gap-1.5">
            {canToggleOriginal && (
              <ToggleButton
                pressed={showOriginal}
                onClick={() => setShowOriginal((v) => !v)}
              >
                Original
              </ToggleButton>
            )}
            {canDiff && (
              <ToggleButton
                pressed={showDiff}
                onClick={() => setShowDiff((v) => !v)}
              >
                Diff
              </ToggleButton>
            )}
          </div>
        </header>
        <div className={`${actionRail} items-center`}>
          <IconButton
            icon={faTrash}
            label="Delete"
            variant="danger"
            onClick={() => onDelete(item.id)}
            {...actionIcon}
          />
        </div>
      </div>

      {isDone && (
        <div className="flex">
          <div className="min-w-0 flex-1 px-4 py-3">
            {canDiff && showDiff ? (
              <DiffView a={item.input} b={item.output} />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                {item.output}
              </pre>
            )}
            {!canDiff && (
              <div className="mt-1 text-[11px] italic text-neutral-400">
                No changes
              </div>
            )}
          </div>
          {item.output ? (
            <div className={`${actionRail} items-start self-stretch pt-3`}>
              <IconButton
                icon={copied === "corrected" ? faCheck : faCopy}
                label={copied === "corrected" ? "Copied" : "Copy corrected"}
                variant="ghost"
                onClick={() => copy("corrected")}
                {...actionIcon}
              />
            </div>
          ) : null}
        </div>
      )}

      {item.status === "pending" && (
        <div className="px-4 py-3">
          <div className="text-sm italic text-neutral-400">Correcting…</div>
        </div>
      )}
      {item.status === "error" && (
        <div className="px-4 py-3">
          <div className="text-sm text-red-600">{item.error}</div>
        </div>
      )}

      {renderOriginal && (
        <div className="flex border-t border-neutral-200 bg-neutral-50 dark:border-gh-border-muted dark:bg-gh-canvas">
          <div className="min-w-0 flex-1 px-4 py-3">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Original
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-neutral-600 dark:text-neutral-400">
              {item.input}
            </pre>
          </div>
          {item.input ? (
            <div className={`${actionRail} items-start self-stretch pt-3`}>
              <IconButton
                icon={copied === "original" ? faCheck : faCopy}
                label={copied === "original" ? "Copied" : "Copy original"}
                variant="ghost"
                onClick={() => copy("original")}
                {...actionIcon}
              />
            </div>
          ) : null}
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

function ToggleButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded px-2 py-0.5 transition ${
        pressed
          ? "bg-neutral-200 text-neutral-800 dark:bg-gh-overlay dark:text-neutral-200"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-gh-overlay/60 dark:hover:text-neutral-300"
      }`}
    >
      {children}
    </button>
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
