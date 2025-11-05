import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { AIProvider, AIContext, AIConfig } from './types';
import { DEFAULT_MODELS } from './constants';
import { createCustomProvider } from './providers/custom';
import { makeLogger } from './utils/log';

const debugConfig = makeLogger('auto:ai-gateway:config');

export function createAIContext(config: AIConfig, defaultProvider?: AIProvider): AIContext {
  return {
    config,
    defaultProvider,
  };
}

export function getAvailableProviders(context: AIContext): AIProvider[] {
  const providers: AIProvider[] = [];
  if (context.config.anthropic != null) providers.push(AIProvider.Anthropic);
  if (context.config.openai != null) providers.push(AIProvider.OpenAI);
  if (context.config.google != null) providers.push(AIProvider.Google);
  if (context.config.xai != null) providers.push(AIProvider.XAI);
  if (context.config.custom != null) providers.push(AIProvider.Custom);
  debugConfig('Available providers: %o', providers);
  return providers;
}

export function getDefaultProvider(context: AIContext): AIProvider {
  if (context.defaultProvider != null) {
    return context.defaultProvider;
  }

  const available = getAvailableProviders(context);
  if (available.length === 0) {
    throw new Error('No AI providers configured in context');
  }
  return available[0];
}

export function getDefaultModel(provider: AIProvider, context: AIContext): string {
  if (provider === AIProvider.Custom) {
    const config = context.config.custom;
    if (config == null) {
      throw new Error('Custom provider not configured');
    }
    debugConfig('Selected custom provider default model %s for provider %s', config.defaultModel, provider);
    return config.defaultModel;
  }

  const model =
    DEFAULT_MODELS[provider] ??
    (() => {
      throw new Error(`Unknown provider: ${provider}`);
    })();
  debugConfig('Selected default model %s for provider %s', model, provider);
  return model;
}

const providerFactories = {
  [AIProvider.OpenAI]: (modelName: string, context: AIContext) => {
    const config = context.config.openai;
    if (config == null) throw new Error('OpenAI provider not configured');
    const openaiProvider = createOpenAI({ apiKey: config.apiKey });
    return openaiProvider(modelName);
  },
  [AIProvider.Anthropic]: (modelName: string, context: AIContext) => {
    const config = context.config.anthropic;
    if (config == null) throw new Error('Anthropic provider not configured');
    const anthropicProvider = createAnthropic({ apiKey: config.apiKey });
    return anthropicProvider(modelName);
  },
  [AIProvider.Google]: (modelName: string, context: AIContext) => {
    const config = context.config.google;
    if (config == null) throw new Error('Google provider not configured');
    const googleProvider = createGoogleGenerativeAI({ apiKey: config.apiKey });
    return googleProvider(modelName);
  },
  [AIProvider.XAI]: (modelName: string, context: AIContext) => {
    const config = context.config.xai;
    if (config == null) throw new Error('XAI provider not configured');
    const xaiProvider = createXai({ apiKey: config.apiKey });
    return xaiProvider(modelName);
  },
  [AIProvider.Custom]: (modelName: string, context: AIContext) => {
    const config = context.config.custom;
    if (config == null) throw new Error('Custom provider not configured');
    const customProvider = createCustomProvider(config);
    return customProvider.languageModel(modelName);
  },
};

function createProviderModel(provider: AIProvider, modelName: string, context: AIContext): LanguageModelV2 {
  const factory = providerFactories[provider];
  if (factory == null) {
    throw new Error(`Unknown provider: ${provider as string}`);
  }
  return factory(modelName, context);
}

export function getModel(provider: AIProvider, model: string | undefined, context: AIContext): LanguageModelV2 {
  const modelName = model ?? getDefaultModel(provider, context);
  debugConfig('Creating model instance for provider %s with model %s', provider, modelName);
  return createProviderModel(provider, modelName, context);
}
