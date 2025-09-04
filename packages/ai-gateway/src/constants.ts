export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google',
  XAI = 'xai',
}

export const DEFAULT_MODELS = {
  [AIProvider.OpenAI]: 'gpt-4o-mini',
  [AIProvider.Anthropic]: 'claude-sonnet-4-20250514',
  [AIProvider.Google]: 'gemini-2.5-pro',
  [AIProvider.XAI]: 'grok-4',
} as const;
