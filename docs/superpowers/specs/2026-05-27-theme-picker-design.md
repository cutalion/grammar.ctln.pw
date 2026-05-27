# Theme picker — design

## Goal

Let the user choose the app's color theme — **System**, **Light**, or **Dark** — from
Settings. Today the app has no toggle: dark mode is driven purely by
`prefers-color-scheme` via Tailwind's `media` strategy. We add an explicit
preference that persists, while keeping the OS preference as the default.

## UX decisions

- **Control:** a 3-way segmented control (`System | Light | Dark`) in a new
  **Appearance** section placed at the **top** of the Settings panel, above
  Providers.
- **Apply timing:** **live** — the theme switches the instant the user picks it
  and is persisted immediately. It is treated as app chrome, not draft form
  data, so it is *not* gated behind Save/Cancel.

## Data model

Add an optional field to `Settings` (`src/storage/settings.ts`):

```ts
theme?: ThemeMode; // 'system' | 'light' | 'dark'
```

- `ThemeMode` is defined in the new `src/lib/theme.ts` and imported by
  `settings.ts`.
- Additive, backward-compatible field → **no bump** to the
  `grammar.settings.v1` localStorage key.
- `loadSettings` defaults a missing/unknown value to `'system'`.
- `saveSettings` already serializes the whole `Settings` object, so it persists
  with no change.

## Tailwind strategy switch

In `tailwind.config.js`, change `darkMode: 'media'` → `darkMode: 'class'`.

All existing `dark:` variants and the static `<body>` classes keep working;
they now key off a `.dark` class on `<html>` instead of the OS media query. The
app becomes responsible for placing that class.

## Theme logic — `src/lib/theme.ts`

- `export type ThemeMode = 'system' | 'light' | 'dark';`
- `resolveTheme(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark'` —
  pure. `system` → `prefersDark ? 'dark' : 'light'`; otherwise returns the
  explicit mode. **Unit-tested** (`src/lib/theme.test.ts`).
- `applyTheme(mode: ThemeMode): void` — resolves the effective theme (reading
  `window.matchMedia('(prefers-color-scheme: dark)').matches` for `prefersDark`),
  toggles the `.dark` class on `document.documentElement`, and sets
  `document.documentElement.style.colorScheme` to the resolved `'light'`/`'dark'`
  so native form controls and scrollbars follow the chosen theme.

## Theme application — `src/hooks/useTheme.ts`

`useTheme(mode: ThemeMode)`:

- On mount and whenever `mode` changes, calls `applyTheme(mode)`.
- Registers a `matchMedia('(prefers-color-scheme: dark)')` `change` listener
  that re-applies the theme **only while `mode === 'system'`**, so a live OS
  theme change is reflected without overriding an explicit Light/Dark choice.
- Cleans up the listener on unmount / mode change.

Called once from `App.tsx` with `settings.theme ?? 'system'`.

## No-flash-on-load — `index.html`

Because the `.dark` class is now JS-driven (not CSS media), add a small
**blocking inline script** in `<head>`, before the module script, that:

1. Reads `localStorage['grammar.settings.v1']`, parses it, reads `theme`
   (defaulting to `'system'`).
2. Resolves the effective theme using `matchMedia`.
3. Sets the `.dark` class and `documentElement.style.colorScheme` before first
   paint.

Wrapped in `try/catch`; on any failure it does nothing and the app falls back to
the OS preference (acceptable, matches today's behavior). The existing
`<meta name="color-scheme" content="light dark">` stays.

## The control — `SettingsPanel.tsx`

A new **Appearance** section at the top of the scrollable panel body (above the
`Providers` heading) containing a 3-way segmented control.

- Current value read from `draft.theme ?? 'system'`.
- On selection, it updates **both** `setDraft` (so Save doesn't revert it) **and**
  commits immediately via `onChange((prev) => ({ ...prev, theme }))`. This is the
  exact pattern `loadModels` already uses to bypass the draft.
- The `onChange` commit flows through `setSettings` in `App.tsx`, re-running
  `useTheme` → instant live switch.

The control may be a small inline segmented control or a tiny local component
within `SettingsPanel.tsx`; styled with the existing Tailwind palette
(`neutral-*` / `gh-*`) to match the panel.

## Docs

Update the dark-mode bullet in `CLAUDE.md` → Conventions. It currently reads
"Dark mode uses the `media` strategy … There is no in-app toggle; if you add
one…". Rewrite it to describe the shipped toggle: `class` strategy, the
`theme` setting, `useTheme` + `applyTheme`, the anti-FOUC inline script, and
that `system` still tracks the OS live.

## Out of scope (YAGNI)

- No theme control on the main top bar (Settings only).
- No transition animation on switch.
- No per-correction or per-provider theming.

## Files touched

| File | Change |
|---|---|
| `src/lib/theme.ts` | **new** — `ThemeMode`, `resolveTheme`, `applyTheme` |
| `src/lib/theme.test.ts` | **new** — tests for `resolveTheme` |
| `src/hooks/useTheme.ts` | **new** — apply on change + matchMedia listener |
| `src/storage/settings.ts` | add `theme` field + default in `loadSettings` |
| `src/App.tsx` | call `useTheme(settings.theme ?? 'system')` |
| `src/components/SettingsPanel.tsx` | Appearance segmented control at top |
| `tailwind.config.js` | `darkMode: 'media'` → `'class'` |
| `index.html` | anti-FOUC inline script |
| `CLAUDE.md` | update dark-mode conventions bullet |

## Testing

- `resolveTheme` unit tests: `system`+prefersDark→dark, `system`+!prefersDark→
  light, `light`→light, `dark`→dark (regardless of `prefersDark`).
- Manual: switch each mode and confirm instant apply, persistence across reload,
  no flash on reload, and that `system` follows a live OS theme change.
- `npm run typecheck` and `npm test` green.
