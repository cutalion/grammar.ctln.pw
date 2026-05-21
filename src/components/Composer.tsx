import { KeyboardEvent, useRef, useState } from 'react';

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText('');
    textareaRef.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder="Paste or type text to correct…"
        rows={4}
        className="w-full resize-y bg-transparent px-4 py-3 text-sm focus:outline-none"
      />
      <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <span className="text-[11px] text-neutral-400">⌘/Ctrl + Enter to submit</span>
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          Correct
        </button>
      </div>
    </div>
  );
}
