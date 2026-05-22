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
