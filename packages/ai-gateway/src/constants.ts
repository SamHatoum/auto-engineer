export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google',
  XAI = 'xai',
  Custom = 'custom',
}

export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

export const DEFAULT_MODELS = {
  [AIProvider.OpenAI]: 'gpt-4o-mini',
  [AIProvider.Anthropic]: 'claude-sonnet-4-5-20250929',
  [AIProvider.Google]: 'gemini-2.5-pro',
  [AIProvider.XAI]: 'grok-4',
} as const;
