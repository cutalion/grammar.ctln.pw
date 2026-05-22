# grammar.ctln.pw

A minimalist, in-browser grammar and writing assistant. Paste text, get a corrected version back. That's it.

Live at **[grammar.ctln.pw](https://grammar.ctln.pw)**.

## What it is

- **Translator-style, not chat.** A vertical stream of independent input → corrected-output pairs. Every submission is its own request — there's no conversation context, no follow-ups.
- **Bring your own key.** You configure an API key for one of several AI providers; the app talks to that provider directly from your browser.
- **Notes when they help.** The model can append a short "Notes" panel for tone, ambiguity, or alternate phrasings — but only when there's something genuinely worth flagging.
- **Mobile-first, dark mode aware.** Follows your OS theme. Designed to feel good on a phone.

## Privacy

Everything stays on your device. There is no backend, no account, no telemetry, no proxy.

- API keys are stored in your browser's `localStorage` and sent **only** to the provider you configured them for (Anthropic, OpenAI, Google, OpenRouter, or whatever OpenAI-compatible endpoint you point at).
- Correction history is stored in `localStorage` too. Clearing your browser data clears the app.
- The site is a static SPA hosted on Netlify. The server has no idea what you typed.

The trade-off: because requests go straight from your browser to the provider, your key is only as safe as the device and browser session you put it in. Don't paste keys into shared machines.

## Supported providers

| Provider | Notes |
|---|---|
| **Anthropic** | Claude models. Browser calls use `anthropic-dangerous-direct-browser-access: true` — fine for a single-user app like this, but be aware. |
| **OpenAI** | Standard `api.openai.com` endpoints. |
| **Google (Gemini)** | Key is passed in the URL (Google's API design, not ours). |
| **OpenRouter** | One key, many models. |
| **OpenAI-compatible** | Anything that speaks the OpenAI Chat Completions API — local LLMs (Ollama, LM Studio, llama.cpp), Together, Groq, DeepSeek, etc. You provide the base URL. |

You can configure **multiple providers** at once and switch between them from the provider picker in the header.

## How to add an API key

1. Open the app.
2. Click the **Settings** (gear) icon in the header.
3. Pick a provider from the list.
4. Paste your API key.
5. (Optional) Click **Load** next to the Model field to fetch the list of models your key has access to — then pick one from the dropdown. The list is cached, so it stays populated across sessions. The field is still free-text, so you can also type a model id that isn't in the list (fine-tunes, preview models, etc.).
6. For **OpenAI-compatible** providers, set the **Base URL** to the path up to (but not including) `/chat/completions` — e.g. `https://openrouter.ai/api/v1` or `http://localhost:11434/v1` for Ollama.
7. Save.

Repeat for as many providers as you want. The provider picker in the main view lets you switch between them per request.

### Where to get keys

- Anthropic — <https://console.anthropic.com/>
- OpenAI — <https://platform.openai.com/api-keys>
- Google (Gemini) — <https://aistudio.google.com/app/apikey>
- OpenRouter — <https://openrouter.ai/keys>
- Anything self-hosted — usually no key needed; just point the base URL at your local server.

## How to use the app

1. Type or paste the text you want corrected into the composer at the bottom.
2. Press **Correct** or hit **⌘/Ctrl + Enter**.
3. The corrected version appears above the composer, along with a diff highlighting changes.
4. If the model has commentary worth sharing (tone, ambiguity, alternative phrasings), a short **Notes** panel appears alongside the correction. For routine edits, it's omitted.
5. The composer clears and re-focuses. Submit another piece of text — it'll be treated as a brand-new request, unrelated to anything above it.

A few details worth knowing:

- **No conversation memory.** Each correction is independent. If you want a different result, edit your input and submit again.
- **Casual by default.** The system prompt tells the model to treat input as casual writing (chat, comments, social posts). Lowercase "i", informal punctuation, and stylistic choices are preserved — they're not "fixed."
- **The model never answers your text.** Even if you paste something that looks like a question or a command ("Write me a poem"), the model treats it as a writing sample to proofread, not an instruction to follow.
- **History survives reloads.** Past corrections stay in the stream until you clear them. They live in `localStorage`, scoped to the domain.
- **Interrupted requests.** If you close the tab mid-request, that item is marked as an error ("Interrupted") next time you open the app.

## Running locally

```bash
git clone https://github.com/cutalion/grammar.ctln.pw.git
cd grammar.ctln.pw
npm install
npm run dev
```

Then open <http://localhost:5173>. Add your API key in Settings as described above.

### Other scripts

```bash
npm run build       # Production build → dist/
npm run preview     # Serve the production build locally
npm run typecheck   # tsc -b --noEmit
npm test            # Run the vitest suite once
npm run test:watch  # Vitest in watch mode
```

## Tech stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** (mobile-first, `media`-strategy dark mode)
- **Vitest** for unit tests on pure utility modules
- **Netlify** for static hosting (`netlify.toml` handles SPA fallback)

No backend, no server functions, no auth, no database. The entire app is the contents of `dist/` after `npm run build`.

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for a deeper tour — provider abstraction, the notes protocol, request flow, and the conventions this codebase tries to hold to.

The short version:

- Two hooks own all persistent state: `useSettings` (provider configs) and `useCorrections` (history). Both back to `localStorage` under versioned keys.
- Each provider implements a small `ProviderAdapter` interface (`send`, `listModels`). Adding a new provider is a single file plus one line in the registry.
- Components are presentational — they receive callbacks and never touch storage or providers directly.

## Contributing

Issues and PRs welcome. A few ground rules baked into the project:

- **No backend.** "Your keys, your browser" is the product. Don't add a proxy.
- **No multi-turn context.** Each correction is independent. Don't reintroduce chat-style history.
- **Mobile-first.** Don't regress the small-screen experience.

## License

MIT.
