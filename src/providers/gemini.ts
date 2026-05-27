import { ProviderAdapter } from './types';

export const gemini: ProviderAdapter = {
  id: 'gemini',
  label: 'Google',
  defaultModel: 'gemini-1.5-flash',
  apiKeyUrl: 'https://aistudio.google.com/apikey',
  async *send({ config, system, messages, signal }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('') ?? '';
    yield text;
  },
  async listModels(config) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(config.apiKey)}&pageSize=200`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    type GModel = { name: string; supportedGenerationMethods?: string[] };
    // Keep only chat-capable models. Entries missing the field are dropped;
    // the Gemini API currently always populates it for usable models.
    return ((data?.models ?? []) as GModel[])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .sort();
  },
};
