import { ProviderAdapter } from './types';

function baseFor(config: { baseURL?: string }): string {
  const base = (config.baseURL ?? '').replace(/\/+$/, '');
  if (!base) throw new Error('Base URL is required for OpenAI-compatible provider');
  return base;
}

export const openaiCompatible: ProviderAdapter = {
  id: 'openai-compatible',
  label: 'OpenAI-compatible',
  defaultModel: '',
  async *send({ config, system, messages, signal }) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
    const res = await fetch(`${baseFor(config)}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: system },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const data = await res.json();
    yield data?.choices?.[0]?.message?.content ?? '';
  },
  async listModels(config) {
    const headers: Record<string, string> = {};
    if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
    const res = await fetch(`${baseFor(config)}/models`, { headers });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const data = await res.json();
    return ((data?.data ?? []) as { id: string }[]).map((m) => m.id).sort();
  },
};
