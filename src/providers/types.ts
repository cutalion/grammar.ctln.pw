export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openai-compatible' | 'openrouter';

export interface ProviderConfig {
  id: string;
  providerId: ProviderId;
  label: string;
  apiKey: string;
  model: string;
  baseURL?: string;
  models?: string[];
  modelsFetchedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface SendOptions {
  config: ProviderConfig;
  system: string;
  messages: ChatMessage[];
  signal: AbortSignal;
}

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  defaultModel: string;
  apiKeyUrl?: string;
  send(opts: SendOptions): AsyncIterable<string>;
  listModels(config: ProviderConfig): Promise<string[]>;
}
