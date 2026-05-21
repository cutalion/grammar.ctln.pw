import { useState } from 'react';
import { Correction } from '../storage/corrections';
import { wordDiff } from '../lib/diff';

interface Props {
  item: Correction;
  onDelete: (id: string) => void;
}

export function CorrectionItem({ item, onDelete }: Props) {
  const [showDiff, setShowDiff] = useState(true);
  const isDone = item.status === 'done';
  const canDiff = isDone && item.output !== item.input;

  const copy = () => {
    if (item.output) void navigator.clipboard?.writeText(item.output);
  };

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {(!canDiff || !showDiff) && (
        <pre className="whitespace-pre-wrap break-words px-4 py-3 font-sans text-sm text-neutral-700 dark:text-neutral-300">
          {item.input}
        </pre>
      )}

      <div
        className={`${
          !canDiff || !showDiff
            ? 'border-t border-neutral-200 dark:border-neutral-800'
            : ''
        } bg-neutral-50 px-4 py-3 dark:bg-neutral-950`}
      >
        {item.status === 'pending' && (
          <div className="text-sm italic text-neutral-400">Correcting…</div>
        )}
        {item.status === 'error' && (
          <div className="text-sm text-red-600">{item.error}</div>
        )}
        {isDone && (canDiff && showDiff
          ? <DiffView a={item.input} b={item.output} />
          : <pre className="whitespace-pre-wrap break-words font-sans text-sm">{item.output}</pre>
        )}
        {isDone && !canDiff && (
          <div className="mt-1 text-[11px] italic text-neutral-400">No changes</div>
        )}
      </div>

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

      <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-1.5 text-[11px] text-neutral-500 dark:border-neutral-800">
        <span className="truncate">
          {item.providerLabel && (
            <>
              {item.providerLabel}
              {item.model ? ` · ${item.model}` : ''} ·{' '}
            </>
          )}
          {new Date(item.createdAt).toLocaleString()}
        </span>
        <div className="flex shrink-0 gap-3">
          {canDiff && (
            <button
              onClick={() => setShowDiff((v) => !v)}
              className="hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              {showDiff ? 'Show clean' : 'Show changes'}
            </button>
          )}
          {isDone && (
            <button onClick={copy} className="hover:text-neutral-700 dark:hover:text-neutral-300">
              Copy
            </button>
          )}
          <button onClick={() => onDelete(item.id)} className="hover:text-red-600">
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function DiffView({ a, b }: { a: string; b: string }) {
  const parts = wordDiff(a, b);
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm">
      {parts.map((p, i) => {
        if (p.type === 'same') return <span key={i}>{p.text}</span>;
        if (p.type === 'add') {
          return (
            <span key={i} className="rounded bg-green-200/70 px-0.5 dark:bg-green-900/40">
              {p.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="rounded bg-red-200/70 px-0.5 line-through decoration-red-700/60 dark:bg-red-900/40"
          >
            {p.text}
          </span>
        );
      })}
    </pre>
  );
}
