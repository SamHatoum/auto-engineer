import { createOpenAI } from '@ai-sdk/openai';
import { CustomProviderConfig } from '../types';

export function createCustomProvider(config: CustomProviderConfig) {
  return createOpenAI({
    name: config.name,
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });
}
