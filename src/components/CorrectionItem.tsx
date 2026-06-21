import { useEffect, useRef, useState } from "react";
import { Correction } from "../storage/corrections";
import { hasMeaningfulDiff, wordDiff } from "../lib/diff";
import { IconButton, faCheck, faCopy, faTrash } from "./Icon";

interface Props {
  item: Correction;
  onDelete: (id: string) => void;
}

type CopiedKind = "corrected" | "original" | "suggested";
type Tab = "corrected" | "suggestions" | "original";
type ActionIcon = { iconSize: "2xs" };

// The active tab resolves to one of these. Every tab renders through the same
// content/diff/notes machinery — they only differ in which text is primary,
// whether (and against what) it diffs, and the labels for each state.
interface ViewModel {
  status: "pending" | "done" | "error" | "absent";
  text: string;
  // Whether this view supports diffing at all. The Original view is the raw
  // input — there is nothing to diff it against, so it always renders plain.
  diffable: boolean;
  // Diff base: the original input for the corrected view, the corrected output
  // for the suggestions view. `baseReady` is false while that base is still
  // pending (the suggestion can finish before the correction does).
  base: string;
  baseReady: boolean;
  error?: string;
  notes?: string;
  copyKind: CopiedKind;
  copyLabel: string;
  pendingLabel: string;
  emptyHint: string;
  absentLabel: string;
}

const actionRail = "flex w-6 shrink-0 justify-center";
const actionIcon: ActionIcon = { iconSize: "2xs" };

export function CorrectionItem({ item, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>("corrected");
  const [showDiff, setShowDiff] = useState(true);
  const [copied, setCopied] = useState<CopiedKind | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copy = (kind: CopiedKind) => {
    const text =
      kind === "corrected"
        ? item.output
        : kind === "original"
          ? item.input
          : (item.suggestion?.output ?? "");
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

  const view = resolveView(item, tab);

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-gh-border-muted dark:bg-gh-surface">
      <div className="flex border-b border-neutral-200 bg-neutral-50 dark:border-gh-border-muted dark:bg-gh-canvas">
        <header className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-1.5 text-[11px] text-neutral-500">
          <div className="flex flex-wrap gap-1.5">
            <SegButton
              emphasis
              pressed={tab === "corrected"}
              onClick={() => setTab("corrected")}
            >
              Corrected
            </SegButton>
            <SegButton
              emphasis
              pressed={tab === "suggestions"}
              onClick={() => setTab("suggestions")}
            >
              Suggestions
            </SegButton>
            <SegButton
              emphasis
              pressed={tab === "original"}
              onClick={() => setTab("original")}
            >
              Original
            </SegButton>
          </div>
          <div className="ml-auto flex gap-1.5">
            <SegButton pressed={showDiff} onClick={() => setShowDiff((v) => !v)}>
              Diff
            </SegButton>
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

      <PrimaryContent
        view={view}
        showDiff={showDiff}
        copied={copied}
        onCopy={() => copy(view.copyKind)}
      />

      {view.status === "done" && view.notes && <NotesPanel notes={view.notes} />}

      {item.model ? (
        <footer className="border-t border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-500 dark:border-gh-border-muted dark:bg-gh-canvas">
          <span className="block truncate">{item.model}</span>
        </footer>
      ) : null}
    </article>
  );
}

function resolveView(item: Correction, tab: Tab): ViewModel {
  if (tab === "corrected") {
    return {
      status: item.status,
      text: item.output,
      diffable: true,
      base: item.input,
      baseReady: true,
      error: item.error,
      notes: item.notes,
      copyKind: "corrected",
      copyLabel: "Copy corrected",
      pendingLabel: "Correcting…",
      emptyHint: "No changes",
      absentLabel: "",
    };
  }
  if (tab === "suggestions") {
    const suggestion = item.suggestion;
    return {
      status: suggestion ? suggestion.status : "absent",
      text: suggestion?.output ?? "",
      diffable: true,
      base: item.output,
      baseReady: item.status === "done",
      error: suggestion?.error,
      notes: suggestion?.notes,
      copyKind: "suggested",
      copyLabel: "Copy suggested",
      pendingLabel: "Generating suggestions…",
      emptyHint: "No suggestions",
      absentLabel: "No suggestions available.",
    };
  }
  // Original: the raw input, always available and never diffed.
  return {
    status: "done",
    text: item.input,
    diffable: false,
    base: item.input,
    baseReady: false,
    copyKind: "original",
    copyLabel: "Copy original",
    pendingLabel: "",
    emptyHint: "",
    absentLabel: "",
  };
}

function PrimaryContent({
  view,
  showDiff,
  copied,
  onCopy,
}: {
  view: ViewModel;
  showDiff: boolean;
  copied: CopiedKind | null;
  onCopy: () => void;
}) {
  if (view.status === "absent") {
    return <StatusLine>{view.absentLabel}</StatusLine>;
  }
  if (view.status === "pending") {
    return <StatusLine>{view.pendingLabel}</StatusLine>;
  }
  if (view.status === "error") {
    return <StatusLine error>{view.error}</StatusLine>;
  }

  const canDiff =
    view.diffable && view.baseReady && hasMeaningfulDiff(view.base, view.text);
  const noChanges = view.diffable && view.baseReady && !canDiff;

  return (
    <div className="flex">
      <div className="min-w-0 flex-1 px-4 py-3">
        {showDiff && canDiff ? (
          <DiffView a={view.base} b={view.text} />
        ) : (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm">
            {view.text}
          </pre>
        )}
        {noChanges && (
          <div className="mt-1 text-[11px] italic text-neutral-400">
            {view.emptyHint}
          </div>
        )}
      </div>
      {view.text ? (
        <div className={`${actionRail} items-start self-stretch pt-3`}>
          <IconButton
            icon={copied === view.copyKind ? faCheck : faCopy}
            label={copied === view.copyKind ? "Copied" : view.copyLabel}
            variant="ghost"
            onClick={onCopy}
            {...actionIcon}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatusLine({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div
        className={
          error ? "text-sm text-red-600" : "text-sm italic text-neutral-400"
        }
      >
        {children}
      </div>
    </div>
  );
}

function NotesPanel({ notes }: { notes: string }) {
  return (
    <div className="border-t border-amber-200/60 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/30">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
        Notes
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-amber-900 dark:text-amber-100">
        {notes}
      </pre>
    </div>
  );
}

// Shared pill button for both the Corrected/Suggestions/Original tabs and the
// Diff toggle. `emphasis` gives the tabs slightly heavier text so the
// view-switch reads as distinct from the display toggle.
function SegButton({
  pressed,
  emphasis,
  onClick,
  children,
}: {
  pressed: boolean;
  emphasis?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded px-2 py-0.5 transition ${emphasis ? "font-medium" : ""} ${
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
