import { createOpenAI } from '@ai-sdk/openai';
import { CustomProviderConfig } from '../constants';
import createDebug from 'debug';

const debug = createDebug('auto:ai-gateway:custom');

export interface CustomProviderOptions {
  config: CustomProviderConfig;
}

export function createCustomProvider(config: CustomProviderConfig) {
  debug('Creating custom provider: %s with baseUrl: %s', config.name, config.baseUrl);

  // Use OpenAI's provider implementation but with custom baseUrl
  // This leverages the existing, battle-tested OpenAI provider while allowing custom endpoints
  const customProvider = createOpenAI({
    name: config.name,
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  debug('Custom provider created successfully: %s', config.name);
  return customProvider;
}
