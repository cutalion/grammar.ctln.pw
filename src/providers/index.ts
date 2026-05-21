import { anthropic } from './anthropic';
import { openai } from './openai';
import { gemini } from './gemini';
import { openaiCompatible } from './openaiCompatible';
import { ProviderAdapter, ProviderId } from './types';

export const adapters: Record<ProviderId, ProviderAdapter> = {
  anthropic,
  openai,
  gemini,
  'openai-compatible': openaiCompatible,
};

export function getAdapter(id: ProviderId): ProviderAdapter {
  return adapters[id];
}
