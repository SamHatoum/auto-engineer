import { generateText, streamText, generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { configureAIProvider } from './config';
import { DEFAULT_MODELS, AIProvider } from './constants';
import { createCustomProvider } from './providers/custom';

export { AIProvider } from './constants';
import { z } from 'zod';
import { getRegisteredToolsForAI } from './mcp-server';
import { startServer } from './mcp-server';
import createDebug from 'debug';

// const debug = createDebug('auto:ai-gateway'); // TODO: Use for general debugging
const debugConfig = createDebug('auto:ai-gateway:config');
const debugAPI = createDebug('auto:ai-gateway:api');
const debugError = createDebug('auto:ai-gateway:error');
const debugTools = createDebug('auto:ai-gateway:tools');
const debugStream = createDebug('auto:ai-gateway:stream');
const debugValidation = createDebug('auto:ai-gateway:validation');

// Error type definitions
const ERROR_PATTERNS = [
  {
    patterns: ['rate limit', '429'],
    statusCode: 429,
    icon: '⚠️',
    message: 'RATE LIMIT ERROR detected for %s',
    checkRetryAfter: true,
  },
  {
    patterns: ['401', 'unauthorized'],
    statusCode: 401,
    icon: '🔐',
    message: 'AUTHENTICATION ERROR - Check your %s API key',
  },
  {
    patterns: ['quota', 'credits', 'insufficient'],
    icon: '💳',
    message: 'QUOTA/CREDITS ERROR - Insufficient credits for %s',
  },
  {
    patterns: ['model', 'not found'],
    icon: '🤖',
    message: 'MODEL ERROR - Model might not be available for %s',
  },
  {
    patterns: ['timeout', 'timed out'],
    icon: '⏱️',
    message: 'TIMEOUT ERROR - Request timed out for %s',
  },
  {
    patterns: ['ECONNREFUSED', 'ENOTFOUND', 'network'],
    icon: '🌐',
    message: 'NETWORK ERROR - Connection failed to %s',
  },
];

// Helper to check and log specific error types
function checkErrorType(message: string, errorAny: Record<string, unknown>, provider: AIProvider): void {
  for (const errorType of ERROR_PATTERNS) {
    const hasPattern = errorType.patterns.some((pattern) => message.includes(pattern));
    const hasStatusCode = errorType.statusCode !== undefined && errorAny.status === errorType.statusCode;

    if (hasPattern || hasStatusCode) {
      debugError(`${errorType.icon} ${errorType.message}`, provider);

      if (errorType.checkRetryAfter === true && errorAny.retryAfter !== undefined) {
        debugError('Retry after: %s seconds', String(errorAny.retryAfter));
      }
      return;
    }
  }
}

// Helper to extract additional error details
function extractErrorDetails(errorAny: Record<string, unknown>): void {
  if (errorAny.response !== undefined && typeof errorAny.response === 'object' && errorAny.response !== null) {
    const response = errorAny.response as Record<string, unknown>;
    debugError('Response status: %s', String(response.status ?? 'unknown'));
    debugError('Response status text: %s', String(response.statusText ?? 'unknown'));
    if (response.data !== undefined) {
      debugError('Response data: %o', response.data);
    }
  }

  if (errorAny.code !== undefined) {
    debugError('Error code: %s', String(errorAny.code));
  }

  if (errorAny.type !== undefined) {
    debugError('Error type: %s', String(errorAny.type));
  }
}

/**
 * Extract and log meaningful error information from Vercel AI SDK errors
 */
function extractAndLogError(error: unknown, provider: AIProvider, operation: string): void {
  debugError('%s failed for provider %s', operation, provider);

  if (error instanceof Error) {
    debugError('Error message: %s', error.message);
    debugError('Error name: %s', error.name);
    debugError('Error stack: %s', error.stack);

    // Check for specific error types from Vercel AI SDK
    const errorAny = error as unknown as Record<string, unknown>;

    // Check various error types
    checkErrorType(error.message, errorAny, provider);

    // Extract additional error details if available
    extractErrorDetails(errorAny);

    // Log raw error object for debugging
    debugError('Full error object: %O', error);
  } else {
    debugError('Unknown error type: %O', error);
  }
}

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

export interface AIOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streamCallback?: (token: string) => void;
  includeTools?: boolean;
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

export function getDefaultAIProvider(): AIProvider {
  const envProvider = process.env.DEFAULT_AI_PROVIDER?.toLowerCase();
  switch (envProvider) {
    case 'openai':
      return AIProvider.OpenAI;
    case 'anthropic':
      return AIProvider.Anthropic;
    case 'google':
      return AIProvider.Google;
    case 'xai':
      return AIProvider.XAI;
    default: {
      // Fallback to the first available provider
      const available = getAvailableProviders();
      return available.length > 0 ? available[0] : AIProvider.Anthropic;
    }
  }
}

export function getDefaultModel(provider: AIProvider): string {
  // Check if DEFAULT_AI_MODEL is set in environment
  const envModel = process.env.DEFAULT_AI_MODEL;
  if (envModel !== undefined && envModel !== null && envModel.trim().length > 0) {
    debugConfig('Using DEFAULT_AI_MODEL from environment: %s for provider %s', envModel, provider);
    return envModel.trim();
  }

  if (provider === AIProvider.Custom) {
    const config = configureAIProvider();
    if (config.custom != null) {
      debugConfig('Selected custom provider default model %s for provider %s', config.custom.defaultModel, provider);
      return config.custom.defaultModel;
    }
    throw new Error('Custom provider not configured');
  }

  const model =
    DEFAULT_MODELS[provider] ??
    (() => {
      throw new Error(`Unknown provider: ${provider}`);
    })();
  debugConfig('Selected default model %s for provider %s', model, provider);
  return model;
}

function getModel(provider: AIProvider, model?: string) {
  const modelName = model ?? getDefaultModel(provider);
  debugConfig('Creating model instance for provider %s with model %s', provider, modelName);

  switch (provider) {
    case AIProvider.OpenAI:
      return openai(modelName);
    case AIProvider.Anthropic:
      return anthropic(modelName);
    case AIProvider.Google:
      return google(modelName);
    case AIProvider.XAI:
      return xai(modelName);
    case AIProvider.Custom: {
      const config = configureAIProvider();
      if (config.custom == null) {
        throw new Error('Custom provider not configured');
      }
      const customProvider = createCustomProvider(config.custom);
      return customProvider.languageModel(modelName);
    }
    default:
      throw new Error(`Unknown provider: ${provider as string}`);
  }
}

export async function generateTextWithAI(prompt: string, options: AIOptions = {}): Promise<string> {
  const resolvedProvider = options.provider ?? getDefaultAIProvider();
  debugAPI('generateTextWithAI called - provider: %s, promptLength: %d', resolvedProvider, prompt.length);
  const finalOptions = { ...defaultOptions, ...options };
  const model = finalOptions.model ?? getDefaultModel(resolvedProvider);
  const modelInstance = getModel(resolvedProvider, model);

  if (finalOptions.includeTools === true) {
    debugTools('Tools requested, starting MCP server');
    await startServer();
    const result = await generateTextWithToolsAI(prompt, options);
    return result.text;
  }

  try {
    debugAPI('Making API call to %s with model %s', resolvedProvider, model);
    debugAPI('Request params - temperature: %d, maxTokens: %d', finalOptions.temperature, finalOptions.maxTokens);

    const result = await generateText({
      model: modelInstance,
      prompt,
      temperature: finalOptions.temperature,
      maxTokens: finalOptions.maxTokens,
    });

    debugAPI('API call successful - response length: %d, usage: %o', result.text.length, result.usage);
    return result.text;
  } catch (error) {
    extractAndLogError(error, resolvedProvider, 'generateTextWithAI');
    throw error;
  }
}

export async function* streamTextWithAI(prompt: string, options: AIOptions = {}): AsyncGenerator<string> {
  const resolvedProvider = options.provider ?? getDefaultAIProvider();
  debugStream('streamTextWithAI called - provider: %s, promptLength: %d', resolvedProvider, prompt.length);
  const finalOptions = { ...defaultOptions, ...options };
  const model = getModel(resolvedProvider, finalOptions.model);

  try {
    debugStream('Starting stream from %s', resolvedProvider);
    const stream = await streamText({
      model,
      prompt,
      temperature: finalOptions.temperature,
      maxTokens: finalOptions.maxTokens,
    });

    let totalChunks = 0;
    let totalLength = 0;
    for await (const chunk of stream.textStream) {
      totalChunks++;
      totalLength += chunk.length;
      debugStream('Chunk %d received - size: %d bytes', totalChunks, chunk.length);
      yield chunk;
    }
    debugStream('Stream completed - total chunks: %d, total length: %d', totalChunks, totalLength);
  } catch (error) {
    extractAndLogError(error, resolvedProvider, 'streamTextWithAI');
    throw error;
  }
}

/**
 * Generates text using streaming and collects the full response.
 * Optionally calls a stream callback for each token if provided.
 * Always returns the complete collected response.
 */
export async function generateTextStreamingWithAI(prompt: string, options: AIOptions = {}): Promise<string> {
  const resolvedProvider = options.provider ?? getDefaultAIProvider();
  debugStream('generateTextStreamingWithAI called - provider: %s', resolvedProvider);
  const finalOptions = { ...defaultOptions, ...options };
  let collectedResult = '';

  const stream = streamTextWithAI(prompt, finalOptions);

  let tokenCount = 0;
  for await (const token of stream) {
    tokenCount++;
    // Collect all tokens for the final result
    collectedResult += token;

    // Call the stream callback if provided
    if (finalOptions.streamCallback) {
      finalOptions.streamCallback(token);
    }
  }

  debugStream('Streaming complete - total tokens: %d, result length: %d', tokenCount, collectedResult.length);
  return collectedResult;
}

// Helper function to handle tool conversation loop
type RegisteredToolForAI = {
  parameters: z.ZodSchema;
  description: string;
  execute?: (args: Record<string, unknown>) => Promise<string>;
};

async function executeToolConversation(
  modelInstance: ReturnType<typeof getModel>,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  registeredTools: Record<string, RegisteredToolForAI>,
  hasTools: boolean,
  finalOptions: AIOptions & { temperature?: number; maxTokens?: number },
  provider: AIProvider,
): Promise<{ finalResult: string; allToolCalls: unknown[] }> {
  let finalResult = '';
  const allToolCalls: unknown[] = [];
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    debugTools('Tool execution attempt %d/%d', attempts, maxAttempts);

    const opts = {
      model: modelInstance,
      messages,
      temperature: finalOptions.temperature,
      maxTokens: finalOptions.maxTokens,
      ...(hasTools && {
        tools: registeredTools,
        toolChoice: 'auto' as const,
      }),
    };
    debugTools('Request options: %o', { ...opts, tools: hasTools ? '[tools included]' : undefined });

    try {
      const result = await generateText(opts);
      debugTools('Result received - has text: %s, tool calls: %d', !!result.text, result.toolCalls?.length ?? 0);

      // Add assistant message to conversation
      if (result.text) {
        messages.push({ role: 'assistant', content: result.text });
        finalResult = result.text;
        debugTools('Assistant message added to conversation');
      }

      // If there are tool calls, execute them and continue conversation
      if (result.toolCalls !== undefined && result.toolCalls.length > 0) {
        allToolCalls.push(...result.toolCalls);
        debugTools('Executing %d tool calls', result.toolCalls.length);

        // Execute tools and create a simple follow-up prompt
        const toolResults = await executeToolCalls(result.toolCalls, registeredTools);
        debugTools('Tool execution completed, results length: %d', toolResults.length);

        // Add the tool results as a user message and request a final response
        messages.push({
          role: 'user',
          content: `${toolResults}Based on this product catalog data, please provide specific product recommendations for a soccer-loving daughter. Include product names, prices, and reasons why each item would be suitable.`,
        });

        // Continue the conversation to get AI's response to tool results
        continue;
      }

      // If no tool calls, we're done
      debugTools('No tool calls, conversation complete');
      break;
    } catch (error) {
      extractAndLogError(error, provider, 'generateTextWithToolsAI');
      throw error;
    }
  }

  return { finalResult, allToolCalls };
}

export async function generateTextWithToolsAI(
  prompt: string,
  options: AIOptions = {},
): Promise<{ text: string; toolCalls?: unknown[] }> {
  const resolvedProvider = options.provider ?? getDefaultAIProvider();
  debugTools('generateTextWithToolsAI called - provider: %s', resolvedProvider);
  const finalOptions = { ...defaultOptions, ...options };
  const model = finalOptions.model ?? getDefaultModel(resolvedProvider);
  const modelInstance = getModel(resolvedProvider, model);

  const registeredTools = finalOptions.includeTools === true ? getRegisteredToolsForAI() : {};
  debugTools('Registered tools: %o', Object.keys(registeredTools));
  const hasTools = Object.keys(registeredTools).length > 0;
  debugTools('Has tools available: %s', hasTools);

  // Build conversation messages
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{ role: 'user', content: prompt }];

  const { finalResult, allToolCalls } = await executeToolConversation(
    modelInstance,
    messages,
    registeredTools,
    hasTools,
    finalOptions,
    resolvedProvider,
  );

  return {
    text: finalResult,
    toolCalls: allToolCalls,
  };
}

async function executeToolCalls(
  toolCalls: unknown[],
  registeredTools: Record<string, RegisteredToolForAI>,
): Promise<string> {
  debugTools('Executing %d tool calls', toolCalls.length);
  let toolResults = '';

  for (const toolCall of toolCalls) {
    try {
      const toolCallObj = toolCall as { toolName: string; args: Record<string, unknown> };
      debugTools('Executing tool: %s with args: %o', toolCallObj.toolName, toolCallObj.args);
      const tool = registeredTools[toolCallObj.toolName];
      if (tool?.execute) {
        const toolResult = await tool.execute(toolCallObj.args);
        toolResults += `Tool ${toolCallObj.toolName} returned: ${String(toolResult)}\n\n`;
        debugTools('Tool %s executed successfully', toolCallObj.toolName);
      } else {
        toolResults += `Error: Tool ${toolCallObj.toolName} not found or missing execute function\n\n`;
        debugTools('Tool %s not found or missing execute function', toolCallObj.toolName);
      }
    } catch (error) {
      const toolCallObj = toolCall as { toolName: string };
      debugError('Tool execution error for %s: %O', toolCallObj.toolName, error);
      toolResults += `Error executing tool ${toolCallObj.toolName}: ${String(error)}\n\n`;
    }
  }

  return toolResults;
}

export async function generateTextWithImageAI(
  text: string,
  imageBase64: string,
  options: AIOptions = {},
): Promise<string> {
  const resolvedProvider = options.provider ?? getDefaultAIProvider();
  debugAPI(
    'generateTextWithImageAI called - provider: %s, textLength: %d, imageSize: %d',
    resolvedProvider,
    text.length,
    imageBase64.length,
  );
  const finalOptions = { ...defaultOptions, ...options };
  const model = finalOptions.model ?? getDefaultModel(resolvedProvider);
  const modelInstance = getModel(resolvedProvider, model);

  if (resolvedProvider !== AIProvider.OpenAI && resolvedProvider !== AIProvider.XAI) {
    debugError('Provider %s does not support image inputs', resolvedProvider);
    throw new Error(`Provider ${resolvedProvider} does not support image inputs`);
  }

  try {
    debugAPI('Sending image+text to %s', resolvedProvider);
    const result = await generateText({
      model: modelInstance,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
      temperature: finalOptions.temperature,
      maxTokens: finalOptions.maxTokens,
    });

    debugAPI('Image API call successful - response length: %d', result.text.length);
    return result.text;
  } catch (error) {
    extractAndLogError(error, resolvedProvider, 'generateTextWithImageAI');
    throw error;
  }
}

export function getAvailableProviders(): AIProvider[] {
  const config = configureAIProvider();
  const providers: AIProvider[] = [];
  if (config.anthropic != null) providers.push(AIProvider.Anthropic);
  if (config.openai != null) providers.push(AIProvider.OpenAI);
  if (config.google != null) providers.push(AIProvider.Google);
  if (config.xai != null) providers.push(AIProvider.XAI);
  if (config.custom != null) providers.push(AIProvider.Custom);
  debugConfig('Available providers: %o', providers);
  return providers;
}

function getEnhancedPrompt(prompt: string, lastError: AIToolValidationError): string {
  const errorDetails = lastError.zodIssues
    ? JSON.stringify(lastError.zodIssues, null, 2)
    : lastError.validationDetails?.cause?.issues
      ? JSON.stringify(lastError.validationDetails.cause.issues, null, 2)
      : lastError.message;

  debugValidation('Enhancing prompt with validation error details: %o', errorDetails);
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

  if (
    error.message.includes('response did not match schema') &&
    'cause' in error &&
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'issues' in error.cause
  ) {
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
    debugValidation(
      'Not retrying - isLastError: %s, isSchemaError: %s, attempt: %d/%d',
      !!lastError,
      lastError ? isSchemaError(lastError) : false,
      attempt + 1,
      maxRetries,
    );
    return { shouldRetry: false, enhancedError: lastError };
  }

  debugValidation('Schema validation failed on attempt %d/%d, will retry', attempt + 1, maxRetries);
  const enhancedError = enhanceValidationError(lastError);

  return { shouldRetry: true, enhancedError };
}

// Helper function to attempt structured data generation with retry logic
async function attemptStructuredGeneration<T>(
  prompt: string,
  provider: AIProvider,
  options: StructuredAIOptions<T>,
  registeredTools: Record<string, RegisteredToolForAI>,
  hasTools: boolean,
): Promise<T> {
  const maxSchemaRetries = 3;
  let lastError: AIToolValidationError | undefined;

  for (let attempt = 0; attempt < maxSchemaRetries; attempt++) {
    try {
      debugValidation('Structured data generation attempt %d/%d', attempt + 1, maxSchemaRetries);
      const model = getModel(provider, options.model);

      const enhancedPrompt = attempt > 0 && lastError ? getEnhancedPrompt(prompt, lastError) : prompt;
      if (attempt > 0) {
        debugValidation('Using enhanced prompt for retry attempt %d', attempt + 1);
      }

      const opts = {
        model,
        prompt: enhancedPrompt,
        schema: options.schema,
        schemaName: options.schemaName,
        schemaDescription: options.schemaDescription,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ...(hasTools && {
          tools: registeredTools,
          toolChoice: 'auto' as const,
        }),
      };
      debugAPI('Generating structured object with schema: %s', options.schemaName ?? 'unnamed');
      const result = await generateObject(opts);
      debugAPI('Structured object generated successfully');
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

export async function generateStructuredDataWithAI<T>(prompt: string, options: StructuredAIOptions<T>): Promise<T> {
  const resolvedProvider = options.provider ?? getDefaultAIProvider();
  debugAPI(
    'generateStructuredDataWithAI called - provider: %s, schema: %s',
    resolvedProvider,
    options.schemaName ?? 'unnamed',
  );

  if (options.includeTools === true) {
    debugTools('Tools requested, starting MCP server');
    await startServer();
  }
  const registeredTools = options.includeTools === true ? getRegisteredToolsForAI() : {};
  debugTools('Registered tools for structured data: %o', Object.keys(registeredTools));
  const hasTools = Object.keys(registeredTools).length > 0;

  return attemptStructuredGeneration(prompt, resolvedProvider, options, registeredTools, hasTools);
}

export async function streamStructuredDataWithAI<T>(prompt: string, options: StreamStructuredAIOptions<T>): Promise<T> {
  const resolvedProvider = options.provider ?? getDefaultAIProvider();
  debugStream(
    'streamStructuredDataWithAI called - provider: %s, schema: %s',
    resolvedProvider,
    options.schemaName ?? 'unnamed',
  );
  const maxSchemaRetries = 3;
  let lastError: AIToolValidationError | undefined;

  for (let attempt = 0; attempt < maxSchemaRetries; attempt++) {
    try {
      debugValidation('Stream structured data attempt %d/%d', attempt + 1, maxSchemaRetries);
      const model = getModel(resolvedProvider, options.model);

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
        debugStream('Starting partial object stream');
        void (async () => {
          try {
            let partialCount = 0;
            for await (const partialObject of result.partialObjectStream) {
              partialCount++;
              debugStream('Partial object %d received', partialCount);
              options.onPartialObject?.(partialObject);
            }
            debugStream('Partial object stream complete - total partials: %d', partialCount);
          } catch (streamError) {
            debugError('Error in partial object stream: %O', streamError);
          }
        })();
      }

      // Return the final complete object
      const finalObject = await result.object;
      debugStream('Final structured object received');
      return finalObject;
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

// Export MCP server singleton functions
export {
  server as mcpServer,
  registerTool,
  registerTools,
  startServer,
  isServerStarted,
  getRegisteredTools,
  getRegisteredToolsForAI,
  getToolHandler,
  getSchemaByName,
  executeRegisteredTool,
  type ToolHandler,
  type RegisteredTool,
} from './mcp-server';
