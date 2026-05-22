# OpenRouter Provider — Design Spec

**Date:** 2026-05-22  
**Status:** Approved

## Summary

Add OpenRouter as a first-class provider alongside Anthropic, OpenAI, and Gemini. OpenRouter is an OpenAI-compatible API gateway that proxies hundreds of models. A dedicated adapter pre-fills the base URL, adds OpenRouter-specific identification headers, and surfaces a "Get key" link in the settings panel.

## Files Changed

| File | Change |
|---|---|
| `src/providers/openrouter.ts` | New file — the adapter |
| `src/providers/types.ts` | Add `'openrouter'` to `ProviderId` union |
| `src/providers/index.ts` | Import and register `openrouter` in `adapters` |

No changes to `SettingsPanel.tsx` or any other file — the UI derives provider buttons from `Object.keys(adapters)` automatically.

## Adapter Spec (`src/providers/openrouter.ts`)

```
id:           'openrouter'
label:        'OpenRouter'
defaultModel: 'openai/gpt-4o-mini'
apiKeyUrl:    'https://openrouter.ai/keys'
baseURL:      'https://openrouter.ai/api/v1'  (hardcoded, not in ProviderConfig)
```

### `send()`

- `POST https://openrouter.ai/api/v1/chat/completions`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <apiKey>`
  - `HTTP-Referer: https://grammar.ctln.pw`
  - `X-Title: grammar.ctln.pw`
- Body: same OpenAI chat completions shape (`model`, `messages` with system + user)
- Response: `data.choices[0].message.content`
- Yields the full response as a single chunk (non-streaming, consistent with other adapters)

### `listModels()`

- `GET https://openrouter.ai/api/v1/models`
- Header: `Authorization: Bearer <apiKey>`
- Response shape: `{ data: [{ id: string }] }` — same as OpenAI; parse identically
- Returns sorted array of model id strings

## Behaviour Notes

- The `openai-compatible` provider is untouched. Users who point it at OpenRouter manually keep working.
- OpenRouter provider has no `baseURL` field in `ProviderConfig` — the URL is not user-configurable.
- The `SettingsPanel` only injects a base URL input for `openai-compatible` (checked by provider id), so OpenRouter will not show that field.
- Auto-load models triggers on `apiKey` change (existing debounce logic handles it; no `baseURL` component in the sig for this provider).
- `apiKeyUrl` is already read by `SettingsPanel` to render the "Get key ↗" link — no UI changes needed.

## Out of Scope

- Streaming responses (consistent with current non-streaming approach across all adapters)
- User-configurable base URL for OpenRouter
- Any changes to existing adapters
