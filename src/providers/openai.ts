import { ProviderAdapter } from './types';

export const openai: ProviderAdapter = {
  id: 'openai',
  label: 'OpenAI',
  defaultModel: 'gpt-4o-mini',
  async *send({ config, system, messages, signal }) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
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
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    yield data?.choices?.[0]?.message?.content ?? '';
  },
  async listModels(config) {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${config.apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return ((data?.data ?? []) as { id: string }[]).map((m) => m.id).sort();
  },
};
