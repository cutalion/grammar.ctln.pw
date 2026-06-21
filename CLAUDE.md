# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

In-browser grammar/writing assistant. Pure client-side SPA — no server, no auth, no telemetry. User brings their own API key for one of several AI providers; everything (keys, history) lives in the browser's `localStorage`. Deployed as a static site on Netlify.

**UX model:** translator-style, not chat. The app is a vertical stream of independent input → corrected-output pairs. Each submission is its own request; there are no follow-ups, no conversation context. A fresh `Composer` is always at the bottom and re-focuses after submit.

Design language: minimalistic, mobile-first.

## Commands

```bash
npm run dev        # Vite dev server (default http://localhost:5173)
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve dist/ for local production check
npm run typecheck  # tsc -b --noEmit
npm test           # vitest run — one-shot
npm run test:watch # vitest watch mode
```

Tests live next to the code they cover as `*.test.ts` (e.g. `src/lib/fuzzy.test.ts`). Only pure utility modules are covered today — there's no React component or integration testing setup. No linter or formatter is configured; if you add one, update this section.

## Architecture

### Big picture

Two hooks own all persistent state; `App.tsx` is the only place that wires them together:

| State | Hook | Persisted as |
|---|---|---|
| Provider configs + which one is active | `useSettings` | `localStorage["grammar.settings.v1"]` |
| Correction history | `useCorrections` | `localStorage["grammar.history.v1"]` |
| Modal visibility | `useState` in `App.tsx` | not persisted |

Components are presentational and receive callbacks; they never touch storage or providers directly.

### Provider abstraction (`src/providers/`)

The key seam in the codebase. Every AI provider implements the same interface:

```ts
interface ProviderAdapter {
  id: ProviderId;
  label: string;
  defaultModel: string;
  send(opts: SendOptions): AsyncIterable<string>;  // yields text deltas
  listModels(config: ProviderConfig): Promise<string[]>;
}
```

`useCorrections.correct()` is provider-agnostic — it builds a single-message `messages: [{role:'user', content: input}]` array, calls `adapter.send(...)`, and accumulates chunks. Adding a new provider means: create an adapter file, register it in `src/providers/index.ts`, add its id to the `ProviderId` union in `types.ts`. Nothing else changes.

The `messages: ChatMessage[]` shape on `SendOptions` is preserved (even though we only ever send one) because every provider natively takes a chat-style input — collapsing to a single string would just push translation into each adapter.

`listModels` is called from the SettingsPanel "Load" button. It hits each provider's models endpoint with the same key the user just configured and returns an array of model ids for a `<datalist>`-backed combobox. The result is cached on the `ProviderConfig` itself (`models`, `modelsFetchedAt`) and persisted through `useSettings`, so the dropdown stays populated across sessions; the button becomes "Reload" once a cache exists. A successful fetch commits to saved settings immediately (bypassing the panel's draft) so the cache survives even if the user cancels unrelated edits. The Model field stays free-text — `listModels` is for autocomplete, not validation, so unlisted models (fine-tunes, preview models) can still be typed.

Today every `send()` adapter yields the full response in one chunk (non-streaming). The iterator shape exists so streaming can be added per-provider without touching consumers.

### Notes (model explanations) protocol

Every correction request uses `SYSTEM_PROMPT`, which tells the model to wrap its reply in tags:

```
<corrected>
... corrected text ...
</corrected>
<notes>
- optional bullet
- another bullet
</notes>
```

The `<notes>` block is *intentionally optional* — the prompt instructs the model to omit it for short or routine edits. `src/lib/parseOutput.ts` extracts both tags; if `<corrected>` is missing (model ignored the format) it falls back to treating the raw response as the corrected text and discarding any structured-notes pretense. Parsed notes are persisted on `Correction.notes` and rendered as an amber "Notes" panel in `CorrectionItem`.

This is unconditional — there's no per-config toggle. Less-capable models may produce poor notes or skip the format; the parser's fallback keeps them functional.

### Suggestions (naturalness rewrites)

Alongside the strict correction, every submit fires a **second, parallel** provider call using `SYSTEM_PROMPT`'s counterpart `SUGGESTION_PROMPT` (`src/prompts/suggestionPrompt.ts`). Where the corrector is forbidden from rewriting, the suggester proposes native-speaker phrasing (articles, prepositions, collocations, idioms, word choice) while preserving meaning, structure, tone, and language. It wraps its reply in `<suggested>…</suggested>` plus an optional `<notes>` block, parsed by the same `parseOutput` (now taking a tag argument: `'corrected'` | `'suggested'`).

Both calls run from the original input and update independent slices of one `Correction` record — top-level fields for the correction, a nested `suggestion: { output, notes?, status, error? }` for the suggestion (`src/storage/corrections.ts`). Either can fail or be interrupted without affecting the other; `loadHistory` rewrites leftover pending suggestions to "Interrupted" just like the top-level status. The field is additive — no localStorage version bump.

`useCorrections` exposes `correct` and `retry`. Both are built on three internal helpers: `runCall` (one provider call → parsed result, tracked in `inFlight`), `runCorrection`, and `runSuggestion` (each owns the fields its slice writes and clears its own error on success). `correct` appends a fresh record and runs both slices; `retry(id, slice, config, systemPrompt)` re-runs a single failed slice in place against the record's original input. A **Retry** button renders in the error state of the Corrected and Suggestions tabs (never Original — the raw input can't error). Retry uses the *currently active* config, so the record's `model`/`providerLabel` are updated to whatever actually ran, keeping the footer truthful even if the provider was switched between attempts.

`CorrectionItem` renders three mutually-exclusive tabs on the left of the header — **Corrected** (input → corrected), **Suggestions** (corrected → suggested), and **Original** (the raw input) — plus a single persistent **Diff** toggle on the right next to the delete button. The model name sits in a footer at the bottom of the card. Each tab resolves (via `resolveView`) to one `ViewModel` (primary text, `diffable`, diff base + `baseReady`, status, notes, copy/empty/pending labels) that a single shared content renderer consumes, so every tab gets the same diff highlighting, empty-state hint, copy button, and amber notes treatment. The Original view is `diffable: false` (nothing to diff the input against), so it always renders plain. The suggestion's diff base is the *corrected* text; while the correction is still pending (`baseReady` false) the suggested text renders plain. Suggestions are always generated (eager); there is no per-config toggle and no separate suggestion model.

### Request flow

1. User types into `Composer`, presses Correct (or ⌘/Ctrl+Enter).
2. `App.handleSubmit` picks the active `ProviderConfig`, calls `correct(text, config)`.
3. `useCorrections.correct`:
   - Appends a `Correction` with `status: 'pending'` to the history (saved to localStorage by the `useEffect` on `items`).
   - Looks up the adapter, calls `adapter.send(...)`, accumulates text.
   - Patches the item to `status: 'done'` with the output, or `status: 'error'` with a message on failure.
4. `CorrectionItem` re-renders accordingly.

On load, any `pending` items left over from a previous session (tab closed mid-request) are rewritten to `error` with "Interrupted" in `loadHistory()` — see `src/storage/corrections.ts`.

### Provider-specific gotchas

- **Anthropic:** browser calls require the `anthropic-dangerous-direct-browser-access: true` header (already set in `anthropic.ts`). Deliberately allowed because the app is single-user and the user supplied their own key. Both `/v1/messages` and `/v1/models` need this header.
- **Gemini:** the API key goes in the URL as `?key=`, not in a header. Roles are `model` for assistant, `user` for user (mapped in the adapter). `listModels` filters to entries supporting `generateContent` and strips the `models/` prefix.
- **OpenAI-compatible:** `baseURL` must be the path *up to but not including* `/chat/completions` (e.g. `https://openrouter.ai/api/v1`). Trailing slashes are stripped. `listModels` assumes a standard `GET {baseURL}/models` — providers that don't implement it will surface the HTTP error inline.

## Conventions

- **No backend.** Don't add a Netlify Function or proxy. The "your keys, your browser" model is the product. If a provider can't be called from the browser without a proxy, document it as unsupported rather than adding server code.
- **No conversation context.** Each `correct()` call sends exactly one user message. Don't reintroduce multi-turn history — past corrections are independent records, not a chat transcript. If a user wants a different correction, they paste again.
- **localStorage keys are versioned** (`grammar.settings.v1`, `grammar.history.v1`). If a shape changes incompatibly, bump the suffix and add a migration in the load function rather than silently breaking existing users.
- **Tailwind only**, with a single `.input` component class in `index.css`. Dark mode uses the `class` strategy — a `.dark` class on `<html>` drives all `dark:` variants. The active theme is a user setting (`Settings.theme`: `'system' | 'light' | 'dark'`, default `system`), persisted in `grammar.settings.v1` and chosen from the `ThemePicker` dropdown in the top bar (a contrast-icon button beside the Settings gear). `src/lib/theme.ts` resolves (`resolveTheme`) and applies (`applyTheme`) the theme — toggling the class and `documentElement.style.colorScheme`. The `useTheme` hook in `App.tsx` re-applies on change and, while the mode is `system`, live-tracks the OS via a `matchMedia` listener so the OS preference still wins by default. A small inline script in `index.html` applies the stored theme before first paint to avoid a flash. `<meta name="color-scheme" content="light dark">` stays so native form controls and scrollbars know both schemes exist.
- **Mobile-first.** Layout uses `100dvh`, the `SettingsPanel` modal goes full-screen below the `sm` breakpoint. Don't regress this when adding UI.
- **Type-only barrel.** `src/providers/index.ts` is the only re-export barrel; everything else imports from the file that defines it.

## Deployment

`netlify.toml` is configured for a static SPA: `npm run build` produces `dist/`, and all paths fall back to `/index.html` so client-side state survives refresh on any URL. No env vars are needed on Netlify — there is no server.
