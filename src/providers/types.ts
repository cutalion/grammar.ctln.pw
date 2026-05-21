export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openai-compatible';

export interface ProviderConfig {
  id: string;
  providerId: ProviderId;
  label: string;
  apiKey: string;
  model: string;
  baseURL?: string;
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
  send(opts: SendOptions): AsyncIterable<string>;
  listModels(config: ProviderConfig): Promise<string[]>;
}
