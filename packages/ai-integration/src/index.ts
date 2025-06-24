import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { loadConfig } from './config';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'xai';

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Export config types and functions
export type { AIConfig } from './config';
export { loadConfig, validateConfig } from './config';

const defaultOptions: AIOptions = {
  temperature: 0.7,
  maxTokens: 1000,
};

function getDefaultModel(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-sonnet-4-20250514';
    case 'google':
      return 'gemini-2.5-pro';
    case 'xai':
      return 'grok-3';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function getModel(provider: AIProvider, model?: string) {
  const modelName = model || getDefaultModel(provider);
  
  switch (provider) {
    case 'openai':
      return openai(modelName);
    case 'anthropic':
      return anthropic(modelName);
    case 'google':
      return google(modelName as string);
    case 'xai':
      return xai(modelName as string);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function generateTextWithAI(
  prompt: string,
  provider: AIProvider,
  options: AIOptions = {}
): Promise<string> {
  const finalOptions = { ...defaultOptions, ...options };
  const model = finalOptions.model || getDefaultModel(provider);
  const modelInstance = getModel(provider, model);
  
  const result = await generateText({
    model: modelInstance,
    prompt,
    temperature: finalOptions.temperature,
    maxTokens: finalOptions.maxTokens,
  });
  
  return result.text;
}

export async function *streamTextWithAI(
  prompt: string,
  provider: AIProvider,
  options: AIOptions = {}
): AsyncGenerator<string> {
  const finalOptions = { ...defaultOptions, ...options };
  const model = getModel(provider, finalOptions.model);

  const stream = await streamText({
    model,
    prompt,
    temperature: finalOptions.temperature,
    maxTokens: finalOptions.maxTokens,
  });

  for await (const chunk of stream.textStream) {
    yield chunk;
  }
}

export function getAvailableProviders(): AIProvider[] {
  const config = loadConfig();
  const providers: AIProvider[] = [];
  if (config.openai) providers.push('openai');
  if (config.anthropic) providers.push('anthropic');
  if (config.google) providers.push('google');
  if (config.xai) providers.push('xai');
  return providers;
} 