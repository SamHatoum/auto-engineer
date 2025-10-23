import { generateText as aiGenerateText, streamText as aiStreamText, generateObject, streamObject } from 'ai';
import {
  AIContext,
  AIOptions,
  StructuredAIOptions,
  StreamStructuredAIOptions,
  AIProvider,
  RegisteredToolForAI,
  AIToolValidationError,
} from './types';
import { getModel, getDefaultProvider, getDefaultModel } from './context';
import { extractAndLogError } from './utils/errors';
import { getEnhancedPrompt, handleFailedRequest } from './utils/validation';
import { makeLogger } from './utils/log';

const debugAPI = makeLogger('auto:ai-gateway:api');
const debugStream = makeLogger('auto:ai-gateway:stream');
const debugTools = makeLogger('auto:ai-gateway:tools');
const debugValidation = makeLogger('auto:ai-gateway:validation');
const debugError = makeLogger('auto:ai-gateway:error');

const defaultOptions: AIOptions = {
  temperature: 0.7,
  maxTokens: 1000,
};

export async function generateText(context: AIContext, prompt: string, options: AIOptions = {}): Promise<string> {
  const resolvedProvider = options.provider ?? getDefaultProvider(context);
  debugAPI('generateText called - provider: %s, promptLength: %d', resolvedProvider, prompt.length);
  const finalOptions = { ...defaultOptions, ...options };
  const model = finalOptions.model ?? getDefaultModel(resolvedProvider, context);
  const modelInstance = getModel(resolvedProvider, finalOptions.model, context);

  try {
    debugAPI('Making API call to %s with model %s', resolvedProvider, model);
    debugAPI('Request params - temperature: %d, maxTokens: %d', finalOptions.temperature, finalOptions.maxTokens);

    const result = await aiGenerateText({
      model: modelInstance,
      prompt,
      temperature: finalOptions.temperature,
      maxTokens: finalOptions.maxTokens,
    });

    debugAPI('API call successful - response length: %d, usage: %o', result.text.length, result.usage);
    return result.text;
  } catch (error) {
    extractAndLogError(error, resolvedProvider, 'generateText');
    throw error;
  }
}

export async function* streamText(context: AIContext, prompt: string, options: AIOptions = {}): AsyncGenerator<string> {
  const resolvedProvider = options.provider ?? getDefaultProvider(context);
  debugStream('streamText called - provider: %s, promptLength: %d', resolvedProvider, prompt.length);
  const finalOptions = { ...defaultOptions, ...options };
  const modelInstance = getModel(resolvedProvider, finalOptions.model, context);

  try {
    debugStream('Starting stream from %s', resolvedProvider);
    const stream = aiStreamText({
      model: modelInstance,
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
    extractAndLogError(error, resolvedProvider, 'streamText');
    throw error;
  }
}

export async function generateTextStreaming(
  context: AIContext,
  prompt: string,
  options: AIOptions = {},
): Promise<string> {
  const resolvedProvider = options.provider ?? getDefaultProvider(context);
  debugStream('generateTextStreaming called - provider: %s', resolvedProvider);
  const finalOptions = { ...defaultOptions, ...options };
  let collectedResult = '';

  const stream = streamText(context, prompt, finalOptions);

  let tokenCount = 0;
  for await (const token of stream) {
    tokenCount++;
    collectedResult += token;

    if (finalOptions.streamCallback) {
      finalOptions.streamCallback(token);
    }
  }

  debugStream('Streaming complete - total tokens: %d, result length: %d', tokenCount, collectedResult.length);
  return collectedResult;
}

export async function generateTextWithImage(
  context: AIContext,
  text: string,
  imageBase64: string,
  options: AIOptions = {},
): Promise<string> {
  const resolvedProvider = options.provider ?? getDefaultProvider(context);
  debugAPI(
    'generateTextWithImage called - provider: %s, textLength: %d, imageSize: %d',
    resolvedProvider,
    text.length,
    imageBase64.length,
  );
  const finalOptions = { ...defaultOptions, ...options };
  const modelInstance = getModel(resolvedProvider, finalOptions.model, context);

  if (resolvedProvider !== AIProvider.OpenAI && resolvedProvider !== AIProvider.XAI) {
    debugError('Provider %s does not support image inputs', resolvedProvider);
    throw new Error(`Provider ${resolvedProvider} does not support image inputs`);
  }

  try {
    debugAPI('Sending image+text to %s', resolvedProvider);
    const result = await aiGenerateText({
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
    extractAndLogError(error, resolvedProvider, 'generateTextWithImage');
    throw error;
  }
}

async function attemptStructuredGeneration<T>(
  context: AIContext,
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
      const modelInstance = getModel(provider, options.model, context);

      const enhancedPrompt = attempt > 0 && lastError ? getEnhancedPrompt(prompt, lastError) : prompt;
      if (attempt > 0) {
        debugValidation('Using enhanced prompt for retry attempt %d', attempt + 1);
      }

      const opts = {
        model: modelInstance,
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

  throw lastError;
}

export async function generateStructuredData<T>(
  context: AIContext,
  prompt: string,
  options: StructuredAIOptions<T>,
  registeredTools: Record<string, RegisteredToolForAI> = {},
): Promise<T> {
  const resolvedProvider = options.provider ?? getDefaultProvider(context);
  debugAPI(
    'generateStructuredData called - provider: %s, schema: %s',
    resolvedProvider,
    options.schemaName ?? 'unnamed',
  );

  const hasTools = Object.keys(registeredTools).length > 0;

  return attemptStructuredGeneration(context, prompt, resolvedProvider, options, registeredTools, hasTools);
}

export async function streamStructuredData<T>(
  context: AIContext,
  prompt: string,
  options: StreamStructuredAIOptions<T>,
): Promise<T> {
  const resolvedProvider = options.provider ?? getDefaultProvider(context);
  debugStream(
    'streamStructuredData called - provider: %s, schema: %s',
    resolvedProvider,
    options.schemaName ?? 'unnamed',
  );
  const maxSchemaRetries = 3;
  let lastError: AIToolValidationError | undefined;

  for (let attempt = 0; attempt < maxSchemaRetries; attempt++) {
    try {
      debugValidation('Stream structured data attempt %d/%d', attempt + 1, maxSchemaRetries);
      const modelInstance = getModel(resolvedProvider, options.model, context);

      const enhancedPrompt = attempt > 0 && lastError ? getEnhancedPrompt(prompt, lastError) : prompt;

      const result = streamObject({
        model: modelInstance,
        prompt: enhancedPrompt,
        schema: options.schema,
        schemaName: options.schemaName,
        schemaDescription: options.schemaDescription,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

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

  throw lastError;
}

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
      const result = await aiGenerateText(opts);
      debugTools('Result received - has text: %s, tool calls: %d', !!result.text, result.toolCalls?.length ?? 0);

      if (result.text) {
        messages.push({ role: 'assistant', content: result.text });
        finalResult = result.text;
        debugTools('Assistant message added to conversation');
      }

      if (result.toolCalls !== undefined && result.toolCalls.length > 0) {
        allToolCalls.push(...result.toolCalls);
        debugTools('Executing %d tool calls', result.toolCalls.length);

        const toolResults = await executeToolCalls(result.toolCalls, registeredTools);
        debugTools('Tool execution completed, results length: %d', toolResults.length);

        messages.push({
          role: 'user',
          content: `${toolResults}\n\nUsing the tool outputs above, continue your response to the original request.`,
        });

        continue;
      }

      debugTools('No tool calls, conversation complete');
      break;
    } catch (error) {
      extractAndLogError(error, provider, 'generateTextWithTools');
      throw error;
    }
  }

  return { finalResult, allToolCalls };
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

export async function generateTextWithTools(
  context: AIContext,
  prompt: string,
  options: AIOptions = {},
  registeredTools: Record<string, RegisteredToolForAI> = {},
): Promise<{ text: string; toolCalls?: unknown[] }> {
  const resolvedProvider = options.provider ?? getDefaultProvider(context);
  debugTools('generateTextWithTools called - provider: %s', resolvedProvider);
  const finalOptions = { ...defaultOptions, ...options };
  const model = finalOptions.model ?? getDefaultModel(resolvedProvider, context);
  const modelInstance = getModel(resolvedProvider, model, context);

  debugTools('Registered tools: %o', Object.keys(registeredTools));
  const hasTools = Object.keys(registeredTools).length > 0;
  debugTools('Has tools available: %s', hasTools);

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
