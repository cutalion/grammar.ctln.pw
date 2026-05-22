# OpenRouter Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OpenRouter as a first-class provider adapter so users can select it from the Settings panel without manually configuring a base URL.

**Architecture:** New `src/providers/openrouter.ts` mirrors the shape of `openaiCompatible.ts` with the base URL hardcoded to `https://openrouter.ai/api/v1` and OpenRouter identification headers baked in. `ProviderId` gains `'openrouter'`, and the `adapters` registry in `index.ts` gets the new entry. No UI changes are needed — the settings panel derives provider buttons from `Object.keys(adapters)` automatically.

**Tech Stack:** TypeScript, native `fetch`, Vite/React project — run `npm run typecheck` to verify, `npm run dev` to test in browser.

---

### Task 1: Extend `ProviderId` union

**Files:**
- Modify: `src/providers/types.ts`

- [ ] **Step 1: Add `'openrouter'` to the union**

Open `src/providers/types.ts`. Change line 1 from:

```ts
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openai-compatible';
```

to:

```ts
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openai-compatible' | 'openrouter';
```

- [ ] **Step 2: Verify typecheck fails on missing adapter (expected)**

```bash
npm run typecheck
```

Expected: TypeScript error about `'openrouter'` not being a key of `adapters` in `index.ts`. This confirms the union change is live and the type system is doing its job.

---

### Task 2: Create the OpenRouter adapter

**Files:**
- Create: `src/providers/openrouter.ts`

- [ ] **Step 1: Create the adapter file**

Create `src/providers/openrouter.ts` with this exact content:

```ts
import { ProviderAdapter } from './types';

const BASE = 'https://openrouter.ai/api/v1';

const HEADERS_BASE = {
  'HTTP-Referer': 'https://grammar.ctln.pw',
  'X-Title': 'grammar.ctln.pw',
};

export const openrouter: ProviderAdapter = {
  id: 'openrouter',
  label: 'OpenRouter',
  defaultModel: 'openai/gpt-4o-mini',
  apiKeyUrl: 'https://openrouter.ai/keys',
  async *send({ config, system, messages, signal }) {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
        ...HEADERS_BASE,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: system },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json();
    yield data?.choices?.[0]?.message?.content ?? '';
  },
  async listModels(config) {
    const res = await fetch(`${BASE}/models`, {
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        ...HEADERS_BASE,
      },
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return ((data?.data ?? []) as { id: string }[]).map((m) => m.id).sort();
  },
};
```

---

### Task 3: Register the adapter and verify

**Files:**
- Modify: `src/providers/index.ts`

- [ ] **Step 1: Import and register `openrouter`**

Open `src/providers/index.ts`. Replace the entire file with:

```ts
import { anthropic } from './anthropic';
import { openai } from './openai';
import { gemini } from './gemini';
import { openaiCompatible } from './openaiCompatible';
import { openrouter } from './openrouter';
import { ProviderAdapter, ProviderId } from './types';

export const adapters: Record<ProviderId, ProviderAdapter> = {
  anthropic,
  openai,
  gemini,
  'openai-compatible': openaiCompatible,
  openrouter,
};

export function getAdapter(id: ProviderId): ProviderAdapter {
  return adapters[id];
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: clean exit, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/providers/openrouter.ts src/providers/types.ts src/providers/index.ts
git commit -m "feat: add OpenRouter as a first-class provider"
```

---

### Task 4: Manual smoke test in browser

**Files:** none

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 2: Verify "OpenRouter" appears in Settings**

Open Settings. Confirm an "+ OpenRouter" button appears in the provider list.

- [ ] **Step 3: Add OpenRouter and check UI**

Click "+ OpenRouter". Confirm:
- Provider card appears with label "OpenRouter"
- No "Base URL" field is shown (only Anthropic, API key, and Models fields)
- "Get key ↗" link appears next to the API key field and points to `https://openrouter.ai/keys`

- [ ] **Step 4: Verify model auto-load (optional — needs a real key)**

If an OpenRouter API key is available, paste it in. After ~600ms the models list should auto-load. The model picker in the top bar should populate with OpenRouter model ids (e.g. `openai/gpt-4o-mini`, `anthropic/claude-3-5-sonnet`, etc.).
