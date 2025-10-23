import { AIProvider } from './types';

export const DEFAULT_MODELS = {
  [AIProvider.OpenAI]: 'gpt-5',
  [AIProvider.Anthropic]: 'claude-sonnet-4-5-20250929',
  [AIProvider.Google]: 'gemini-2.5-pro',
  [AIProvider.XAI]: 'grok-4',
} as const;
