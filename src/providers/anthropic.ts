import { ProviderAdapter } from './types';

const HEADERS_BASE = {
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
};

export const anthropic: ProviderAdapter = {
  id: 'anthropic',
  label: 'Anthropic (Claude)',
  defaultModel: 'claude-sonnet-4-6',
  async *send({ config, system, messages, signal }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        ...HEADERS_BASE,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data?.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
    yield text;
  },
  async listModels(config) {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
      headers: {
        'x-api-key': config.apiKey,
        ...HEADERS_BASE,
      },
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return ((data?.data ?? []) as { id: string }[]).map((m) => m.id);
  },
};
