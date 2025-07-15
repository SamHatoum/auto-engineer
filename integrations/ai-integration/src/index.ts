import { generateText, streamText, generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { configureAIProvider } from './config';
import { z } from 'zod';

interface AIToolValidationError extends Error {
  cause?: {
    issues?: unknown[];
    [key: string]: unknown;
  };
  issues?: unknown[];
  errors?: unknown[];
  zodIssues?: unknown[];
  validationDetails?: {
    cause?: {
      issues?: unknown[];
    };
    issues?: unknown[];
    errors?: unknown[];
  };
  schemaDescription?: string;
  [key: string]: unknown;
}

export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google',
  XAI = 'xai',
}

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
  onPartialObject?: (partialObject: unknown) => void;
}

const defaultOptions: AIOptions = {
  temperature: 0.7,
  maxTokens: 1000,
};

function getDefaultModel(provider: AIProvider): string {
  switch (provider) {
    case AIProvider.OpenAI:
      return 'gpt-4o-mini';
    case AIProvider.Anthropic:
      return 'claude-sonnet-4-20250514';
    case AIProvider.Google:
      return 'gemini-2.5-pro';
    case AIProvider.XAI:
      return 'grok-3';
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function getModel(provider: AIProvider, model?: string) {
  const modelName = model ?? getDefaultModel(provider);
  
  switch (provider) {
    case AIProvider.OpenAI:
      return openai(modelName);
    case AIProvider.Anthropic:
      return anthropic(modelName);
    case AIProvider.Google:
      return google(modelName);
    case AIProvider.XAI:
      return xai(modelName);
    default:
      throw new Error(`Unknown provider: ${provider as string}`);
  }
}

export async function generateTextWithAI(
  prompt: string,
  provider: AIProvider,
  options: AIOptions = {}
): Promise<string> {
  const finalOptions = { ...defaultOptions, ...options };
  const model = finalOptions.model ?? getDefaultModel(provider);
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
  if (config.openai != null) providers.push(AIProvider.OpenAI);
  if (config.anthropic != null) providers.push(AIProvider.Anthropic);
  if (config.google != null) providers.push(AIProvider.Google);
  if (config.xai != null) providers.push(AIProvider.XAI);
  return providers;
}

function getEnhancedPrompt(prompt: string, lastError: AIToolValidationError): string {
  const errorDetails = lastError.zodIssues
    ? JSON.stringify(lastError.zodIssues, null, 2)
    : lastError.validationDetails?.cause?.issues
    ? JSON.stringify(lastError.validationDetails.cause.issues, null, 2)
    : lastError.message;

  return `${prompt}\\n\\n⚠️ IMPORTANT: Your previous response failed validation with the following errors:\\n${errorDetails}\\n\\nPlease fix these errors and ensure your response EXACTLY matches the required schema structure.`;
}

function isSchemaError(error: Error): boolean {
  return (
    error.message.includes('response did not match schema') ||
    error.message.includes('TypeValidationError') ||
    error.name === 'AI_TypeValidationError'
  );
}

function enhanceValidationError(error: AIToolValidationError): AIToolValidationError {
  const enhancedError = new Error(error.message) as AIToolValidationError;
  Object.assign(enhancedError, error);

  if (error.cause !== undefined || error.issues !== undefined || error.errors !== undefined) {
    enhancedError.validationDetails = {
      cause: error.cause,
      issues: error.issues,
      errors: error.errors,
    };
  }

  if (error.message.includes('response did not match schema') && 'cause' in error && typeof error.cause === 'object' && error.cause !== null && 'issues' in error.cause) {
    enhancedError.zodIssues = error.cause.issues as unknown[];
  }
  return enhancedError;
}

function handleFailedRequest(
  lastError: AIToolValidationError | undefined,
  maxRetries: number,
  attempt: number,
): { shouldRetry: boolean; enhancedError?: AIToolValidationError } {
  if (!lastError || !isSchemaError(lastError) || attempt >= maxRetries - 1) {
    return { shouldRetry: false, enhancedError: lastError };
  }

  console.log(`Schema validation failed on attempt ${attempt + 1}/${maxRetries}, retrying...`);
  const enhancedError = enhanceValidationError(lastError);

  return { shouldRetry: true, enhancedError };
}

export async function generateStructuredDataWithAI<T>(
  prompt: string,
  provider: AIProvider,
  options: StructuredAIOptions<T>,
): Promise<T> {
  const maxSchemaRetries = 3;
  let lastError: AIToolValidationError | undefined;

  for (let attempt = 0; attempt < maxSchemaRetries; attempt++) {
    try {
      const model = getModel(provider, options.model);

      const enhancedPrompt = attempt > 0 && lastError ? getEnhancedPrompt(prompt, lastError) : prompt;

      const result = await generateObject({
        model,
        prompt: enhancedPrompt,
        schema: options.schema,
        schemaName: options.schemaName,
        schemaDescription: options.schemaDescription,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      return result.object;
    } catch (error: unknown) {
      lastError =
        error instanceof Error
          ? (error as AIToolValidationError)
          : (new Error('An unknown error occurred') as AIToolValidationError);

      const { shouldRetry, enhancedError } = handleFailedRequest(lastError, maxSchemaRetries, attempt);
      lastError = enhancedError;

      if (!shouldRetry) {
        throw lastError;
      }
    }
  }

  // If we exhausted all retries, throw the last error
  throw lastError;
}

export async function streamStructuredDataWithAI<T>(
  prompt: string,
  provider: AIProvider,
  options: StreamStructuredAIOptions<T>,
): Promise<T> {
  const maxSchemaRetries = 3;
  let lastError: AIToolValidationError | undefined;

  for (let attempt = 0; attempt < maxSchemaRetries; attempt++) {
    try {
      const model = getModel(provider, options.model);

      const enhancedPrompt = attempt > 0 && lastError ? getEnhancedPrompt(prompt, lastError) : prompt;

      const result = streamObject({
        model,
        prompt: enhancedPrompt,
        schema: options.schema,
        schemaName: options.schemaName,
        schemaDescription: options.schemaDescription,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      // Stream partial objects if callback provided
      if (options.onPartialObject) {
        void (async () => {
          try {
            for await (const partialObject of result.partialObjectStream) {
              options.onPartialObject?.(partialObject);
            }
          } catch (streamError) {
            console.error('Error in partial object stream:', streamError);
          }
        })();
      }

      // Return the final complete object
      return await result.object;
    } catch (error: unknown) {
      lastError =
        error instanceof Error
          ? (error as AIToolValidationError)
          : (new Error('An unknown error occurred') as AIToolValidationError);

      const { shouldRetry, enhancedError } = handleFailedRequest(lastError, maxSchemaRetries, attempt);
      lastError = enhancedError;

      if (!shouldRetry) {
        throw lastError;
      }
    }
  }

  // If we exhausted all retries, throw the last error
  throw lastError;
}

// Export zod for convenience
export { z }; 