import { useEffect, useRef, useState } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ThemeMode } from '../lib/theme';
import {
  Icon,
  IconButton,
  faCheck,
  faCircleHalfStroke,
  faDesktop,
  faSun,
  faMoon,
} from './Icon';

interface Props {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const MODES: { mode: ThemeMode; label: string; icon: IconDefinition }[] = [
  { mode: 'system', label: 'System', icon: faDesktop },
  { mode: 'light', label: 'Light', icon: faSun },
  { mode: 'dark', label: 'Dark', icon: faMoon },
];

export function ThemePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <IconButton
        icon={faCircleHalfStroke}
        label="Theme"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      />

      {open && (
        <div
          role="group"
          aria-label="Theme"
          className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-gh-border dark:bg-gh-surface"
        >
          {MODES.map(({ mode, label, icon }) => {
            const isActive = value === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  onChange(mode);
                  setOpen(false);
                }}
                className={
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-gh-overlay ' +
                  (isActive ? 'font-semibold' : 'text-neutral-600 dark:text-neutral-300')
                }
              >
                <Icon icon={icon} className="text-neutral-400" />
                <span className="flex-1 text-left">{label}</span>
                {isActive && <Icon icon={faCheck} size="xs" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
