import { AIContext, AIOptions, StructuredAIOptions, StreamStructuredAIOptions, AIProvider } from '../core/types';
import {
  createAIContext,
  getDefaultProvider as coreGetDefaultProvider,
  getAvailableProviders as coreGetAvailableProviders,
  getDefaultModel as coreGetDefaultModel,
} from '../core/context';
import {
  generateText as coreGenerateText,
  streamText as coreStreamText,
  generateTextStreaming as coreGenerateTextStreaming,
  generateTextWithImage as coreGenerateTextWithImage,
  generateStructuredData as coreGenerateStructuredData,
  streamStructuredData as coreStreamStructuredData,
  generateTextWithTools as coreGenerateTextWithTools,
} from '../core/generators';
import { configureAIProvider } from './config';
import { getRegisteredToolsForAI, startServer } from './mcp-server';

let globalContext: AIContext | null = null;

export function resetGlobalContext(): void {
  globalContext = null;
}

function getOrCreateContext(): AIContext {
  if (!globalContext) {
    const config = configureAIProvider();
    const defaultProvider = determineDefaultProvider();
    globalContext = createAIContext(config, defaultProvider);
  }
  return globalContext;
}

function determineDefaultProvider(): AIProvider | undefined {
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
    default:
      return undefined;
  }
}

export function getDefaultAIProvider(): AIProvider {
  const context = getOrCreateContext();
  return coreGetDefaultProvider(context);
}

export function getDefaultModel(provider: AIProvider): string {
  const envModel = process.env.DEFAULT_AI_MODEL;
  if (envModel !== undefined && envModel !== null && envModel.trim().length > 0) {
    return envModel.trim();
  }

  const context = getOrCreateContext();
  return coreGetDefaultModel(provider, context);
}

export function getAvailableProviders(): AIProvider[] {
  const context = getOrCreateContext();
  return coreGetAvailableProviders(context);
}

export async function generateTextWithAI(prompt: string, options: AIOptions = {}): Promise<string> {
  const context = getOrCreateContext();

  if (options.includeTools === true) {
    try {
      await startServer();
    } catch (e) {
      throw new Error(`MCP server failed to start: ${(e as Error).message}`);
    }
    const tools = getRegisteredToolsForAI();
    const result = await coreGenerateTextWithTools(context, prompt, options, tools);
    return result.text;
  }

  return coreGenerateText(context, prompt, options);
}

export async function* streamTextWithAI(prompt: string, options: AIOptions = {}): AsyncGenerator<string> {
  const context = getOrCreateContext();
  yield* coreStreamText(context, prompt, options);
}

export async function generateTextStreamingWithAI(prompt: string, options: AIOptions = {}): Promise<string> {
  const context = getOrCreateContext();
  return coreGenerateTextStreaming(context, prompt, options);
}

export async function generateTextWithImageAI(
  text: string,
  imageBase64: string,
  options: AIOptions = {},
): Promise<string> {
  const context = getOrCreateContext();
  return coreGenerateTextWithImage(context, text, imageBase64, options);
}

export async function generateStructuredDataWithAI<T>(prompt: string, options: StructuredAIOptions<T>): Promise<T> {
  const context = getOrCreateContext();

  if (options.includeTools === true) {
    try {
      await startServer();
    } catch (e) {
      throw new Error(`MCP server failed to start: ${(e as Error).message}`);
    }
    const tools = getRegisteredToolsForAI();
    return coreGenerateStructuredData(context, prompt, options, tools);
  }

  return coreGenerateStructuredData(context, prompt, options);
}

export async function streamStructuredDataWithAI<T>(prompt: string, options: StreamStructuredAIOptions<T>): Promise<T> {
  const context = getOrCreateContext();
  return coreStreamStructuredData(context, prompt, options);
}

export async function generateTextWithToolsAI(
  prompt: string,
  options: AIOptions = {},
): Promise<{ text: string; toolCalls?: unknown[] }> {
  const context = getOrCreateContext();
  await startServer();
  const tools = getRegisteredToolsForAI();
  return coreGenerateTextWithTools(context, prompt, options, tools);
}
