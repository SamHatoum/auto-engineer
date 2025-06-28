import { generateText, streamText, generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { configureAIProvider } from './config';
import { z } from 'zod';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'xai';

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streamCallback?: (token: string) => void;
}

export interface StructuredAIOptions<T> extends Omit<AIOptions, 'streamCallback'> {
  schema: z.ZodSchema<T>;
  schemaName?: string;
  schemaDescription?: string;
}

export interface StreamStructuredAIOptions<T> extends StructuredAIOptions<T> {
  onPartialObject?: (partialObject: any) => void;
}

export type { AIConfig } from './config';

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

/**
 * Generates text using streaming and collects the full response.
 * Optionally calls a stream callback for each token if provided.
 * Always returns the complete collected response.
 */
export async function generateTextStreamingWithAI(
  prompt: string,
  provider: AIProvider,
  options: AIOptions = {}
): Promise<string> {
  const finalOptions = { ...defaultOptions, ...options };
  let collectedResult = '';

  const stream = streamTextWithAI(prompt, provider, finalOptions);
  
  for await (const token of stream) {
    // Collect all tokens for the final result
    collectedResult += token;
    
    // Call the stream callback if provided
    if (finalOptions.streamCallback) {
      finalOptions.streamCallback(token);
    }
  }

  return collectedResult;
}

export function getAvailableProviders(): AIProvider[] {
  const config = configureAIProvider();
  const providers: AIProvider[] = [];
  if (config.openai) providers.push('openai');
  if (config.anthropic) providers.push('anthropic');
  if (config.google) providers.push('google');
  if (config.xai) providers.push('xai');
  return providers;
}

export async function generateStructuredDataWithAI<T>(
  prompt: string,
  provider: AIProvider,
  options: StructuredAIOptions<T>
): Promise<T> {
  const model = getModel(provider, options.model);
  
  const result = await generateObject({
    model,
    prompt,
    schema: options.schema,
    schemaName: options.schemaName,
    schemaDescription: options.schemaDescription,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
  
  return result.object;
}

export async function streamStructuredDataWithAI<T>(
  prompt: string,
  provider: AIProvider,
  options: StreamStructuredAIOptions<T>
): Promise<T> {
  const model = getModel(provider, options.model);
  
  const result = streamObject({
    model,
    prompt,
    schema: options.schema,
    schemaName: options.schemaName,
    schemaDescription: options.schemaDescription,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });

  // Stream partial objects if callback provided
  if (options.onPartialObject) {
    (async () => {
      for await (const partialObject of result.partialObjectStream) {
        options.onPartialObject!(partialObject);
      }
    })();
  }

  // Return the final complete object
  return await result.object;
}

// Export zod for convenience
export { z }; 