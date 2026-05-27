# Theme Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a System/Light/Dark theme picker to Settings that applies live and persists, while keeping the OS preference as the default.

**Architecture:** Switch Tailwind from the `media` dark-mode strategy to `class`. A new `Settings.theme` field (default `system`) is applied to `<html>` by `applyTheme` in `src/lib/theme.ts`; the `useTheme` hook re-applies on change and live-tracks the OS while in `system` mode. An inline script in `index.html` applies the stored theme before first paint to avoid a flash. A 3-way segmented control at the top of `SettingsPanel` writes the setting live (bypassing the draft, like the models cache does).

**Tech Stack:** React 18, TypeScript, Tailwind 3, Vite, Vitest.

---

### Task 1: Pure theme resolution (`resolveTheme`)

**Files:**
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('resolves system to dark when the OS prefers dark', () => {
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('resolves system to light when the OS does not prefer dark', () => {
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('returns the explicit mode regardless of OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- theme`
Expected: FAIL — cannot resolve `./theme` / `resolveTheme is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/theme.ts`:

```ts
export type ThemeMode = 'system' | 'light' | 'dark';

export function resolveTheme(
  mode: ThemeMode,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- theme`
Expected: PASS (4 assertions across 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts
git commit -m "Add resolveTheme theme-mode resolver"
```

---

### Task 2: DOM application (`applyTheme`)

**Files:**
- Modify: `src/lib/theme.ts`

No unit test — this touches `window`/`document`, and the codebase only unit-tests pure modules. It is exercised manually in Task 7.

- [ ] **Step 1: Append `applyTheme` to `src/lib/theme.ts`**

Add below `resolveTheme`:

```ts
export function applyTheme(mode: ThemeMode): void {
  const prefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches;
  const effective = resolveTheme(mode, prefersDark);
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  root.style.colorScheme = effective;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme.ts
git commit -m "Add applyTheme to drive the .dark class and color-scheme"
```

---

### Task 3: Persist the `theme` setting

**Files:**
- Modify: `src/storage/settings.ts`

- [ ] **Step 1: Add the field and load-time normalization**

Replace the full contents of `src/storage/settings.ts` with:

```ts
import { ProviderConfig } from '../providers/types';
import { ThemeMode } from '../lib/theme';

const KEY = 'grammar.settings.v1';

export interface Settings {
  configs: ProviderConfig[];
  activeConfigId: string | null;
  systemPrompt?: string;
  theme?: ThemeMode;
}

const empty: Settings = { configs: [], activeConfigId: null };

function normalizeTheme(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Settings;
    return {
      configs: parsed.configs ?? [],
      activeConfigId: parsed.activeConfigId ?? null,
      systemPrompt: parsed.systemPrompt,
      theme: normalizeTheme(parsed.theme),
    };
  } catch {
    return empty;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
```

This is an additive optional field — the `grammar.settings.v1` key is **not** bumped. Existing stored settings (no `theme`) load as `system`.

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/storage/settings.ts
git commit -m "Add optional theme field to Settings"
```

---

### Task 4: `useTheme` hook

**Files:**
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useTheme.ts`:

```ts
import { useEffect } from 'react';
import { applyTheme, ThemeMode } from '../lib/theme';

// Applies the chosen theme to <html>. While the mode is `system`, a
// matchMedia listener re-applies on live OS theme changes so the OS
// preference still wins by default. Explicit light/dark ignore the OS.
export function useTheme(mode: ThemeMode) {
  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTheme.ts
git commit -m "Add useTheme hook applying theme with system live-tracking"
```

---

### Task 5: Activate class-based dark mode

Lands together so the app is never broken between commits: switching Tailwind to `class` requires something to put the `.dark` class on `<html>` (the inline script for first paint, `useTheme` for runtime).

**Files:**
- Modify: `tailwind.config.js:4`
- Modify: `index.html` (add inline script in `<head>`)
- Modify: `src/App.tsx` (import + call `useTheme`)

- [ ] **Step 1: Switch Tailwind dark-mode strategy**

In `tailwind.config.js`, change line 4:

```js
  darkMode: 'media',
```

to:

```js
  darkMode: 'class',
```

- [ ] **Step 2: Add the anti-FOUC inline script to `index.html`**

In `index.html`, immediately after the `<meta name="color-scheme" content="light dark" />` line, add:

```html
    <script>
      (function () {
        try {
          var raw = localStorage.getItem('grammar.settings.v1');
          var mode = raw ? JSON.parse(raw).theme || 'system' : 'system';
          var prefersDark = window.matchMedia(
            '(prefers-color-scheme: dark)',
          ).matches;
          var dark = mode === 'dark' || (mode === 'system' && prefersDark);
          if (dark) document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 3: Wire `useTheme` into `App.tsx`**

In `src/App.tsx`, add the import after the existing hook imports (near line 2-3):

```ts
import { useTheme } from "./hooks/useTheme";
```

Then, inside `App()`, immediately after the `const [composerOutOfView, setComposerOutOfView] = useState(false);` line (line 17), add:

```ts
  useTheme(settings.theme ?? "system");
```

- [ ] **Step 4: Verify it compiles and tests pass**

Run: `npm run typecheck && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Manually verify in the dev server**

Run: `npm run dev`, open the app. With no `theme` stored it should match your OS theme exactly as before (no flash on reload). Stop the server when done.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js index.html src/App.tsx
git commit -m "Drive dark mode via class with stored theme and no-flash script"
```

---

### Task 6: Appearance segmented control in Settings

**Files:**
- Modify: `src/components/SettingsPanel.tsx`

- [ ] **Step 1: Import `ThemeMode`**

In `src/components/SettingsPanel.tsx`, after the existing import of provider types (line 10, `import { ProviderConfig, ProviderId } from "../providers/types";`), add:

```ts
import { ThemeMode } from "../lib/theme";
```

- [ ] **Step 2: Add a live theme setter inside the component**

Inside `SettingsPanel`, after the `const update = (...) => {...}` definition (ends near line 108), add:

```ts
  const theme: ThemeMode = draft.theme ?? "system";
  // Theme is app chrome, not draft form data: update the draft (so Save does
  // not revert it) AND commit immediately so it applies live and survives
  // Cancel — the same bypass loadModels uses for the models cache.
  const setTheme = (next: ThemeMode) => {
    setDraft((d) => ({ ...d, theme: next }));
    onChange((prev) => ({ ...prev, theme: next }));
  };
```

- [ ] **Step 3: Add the Appearance section at the top of the panel body**

In the scrollable body `<div className="flex-1 space-y-4 overflow-y-auto p-4">`, insert this as its **first** child, immediately before `<h3 className="text-sm font-semibold">Providers</h3>`:

```tsx
          <div className="space-y-2 border-b border-neutral-200 pb-4 dark:border-gh-border-muted">
            <h3 className="text-sm font-semibold">Appearance</h3>
            <div className="inline-flex rounded-md border border-neutral-300 p-0.5 dark:border-gh-border">
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={
                    "rounded px-3 py-1 text-xs capitalize transition " +
                    (theme === mode
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-gh-overlay")
                  }
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
```

- [ ] **Step 4: Verify it compiles and tests pass**

Run: `npm run typecheck && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Manually verify live switching and persistence**

Run: `npm run dev`. Open Settings, click Light/Dark/System — the whole app should switch instantly. Close with **Cancel**: the choice sticks. Reload: choice persists with no flash. With `System` selected, change your OS theme and confirm the app follows. Stop the server when done.

- [ ] **Step 6: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "Add Appearance theme picker to Settings"
```

---

### Task 7: Update CLAUDE.md conventions

**Files:**
- Modify: `CLAUDE.md` (the dark-mode bullet under Conventions)

- [ ] **Step 1: Replace the dark-mode bullet**

In `CLAUDE.md` → `## Conventions`, replace the bullet that begins "**Tailwind only**, with a single `.input` component class…" (the one describing the `media` strategy and "There is no in-app toggle") with:

```markdown
- **Tailwind only**, with a single `.input` component class in `index.css`. Dark mode uses the `class` strategy — a `.dark` class on `<html>` drives all `dark:` variants. The active theme is a user setting (`Settings.theme`: `'system' | 'light' | 'dark'`, default `system`), persisted in `grammar.settings.v1` and chosen from the **Appearance** section at the top of `SettingsPanel`. `src/lib/theme.ts` resolves (`resolveTheme`) and applies (`applyTheme`) the theme — toggling the class and `documentElement.style.colorScheme`. The `useTheme` hook in `App.tsx` re-applies on change and, while the mode is `system`, live-tracks the OS via a `matchMedia` listener so the OS preference still wins by default. A small inline script in `index.html` applies the stored theme before first paint to avoid a flash. `<meta name="color-scheme" content="light dark">` stays so native form controls and scrollbars know both schemes exist.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Document class-based theme picker in CLAUDE.md"
```

---

## Final verification

- [ ] `npm run typecheck` — no errors.
- [ ] `npm test` — all pass.
- [ ] `npm run build` — succeeds.
- [ ] Manual matrix: each of System/Light/Dark applies live, persists across reload with no flash, and `system` follows a live OS theme change.
