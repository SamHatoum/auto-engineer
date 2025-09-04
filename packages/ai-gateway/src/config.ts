import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import createDebug from 'debug';
import { CustomProviderConfig } from './constants';

const debug = createDebug('ai-gateway:config');
const debugEnv = createDebug('ai-gateway:config:env');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../.env');
debug('Loading environment from: %s', envPath);
dotenv.config({ path: envPath });

export interface AIConfig {
  openai?: {
    apiKey: string;
  };
  anthropic?: {
    apiKey: string;
  };
  google?: {
    apiKey: string;
  };
  xai?: {
    apiKey: string;
  };
  custom?: CustomProviderConfig;
}

// Helper to log provider configuration
function logProviderConfig(providerName: string, apiKey: string | undefined): void {
  if (apiKey !== undefined) {
    debug('%s provider configured with API key ending in: ...%s', providerName, apiKey.slice(-4));
  }
}

// Helper to build custom provider config
function buildCustomProviderConfig(): CustomProviderConfig | undefined {
  const name = process.env.CUSTOM_PROVIDER_NAME;
  const baseUrl = process.env.CUSTOM_PROVIDER_BASE_URL;
  const apiKey = process.env.CUSTOM_PROVIDER_API_KEY;
  const defaultModel = process.env.CUSTOM_PROVIDER_DEFAULT_MODEL;

  if (
    name != null &&
    name.length > 0 &&
    baseUrl != null &&
    baseUrl.length > 0 &&
    apiKey != null &&
    apiKey.length > 0 &&
    defaultModel != null &&
    defaultModel.length > 0
  ) {
    return {
      name,
      baseUrl,
      apiKey,
      defaultModel,
    };
  }

  return undefined;
}

// Helper to build provider config
function buildProviderConfig(): AIConfig {
  return {
    openai: process.env.OPENAI_API_KEY != null ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY != null ? { apiKey: process.env.ANTHROPIC_API_KEY } : undefined,
    google: process.env.GEMINI_API_KEY != null ? { apiKey: process.env.GEMINI_API_KEY } : undefined,
    xai: process.env.XAI_API_KEY != null ? { apiKey: process.env.XAI_API_KEY } : undefined,
    custom: buildCustomProviderConfig(),
  };
}

export function configureAIProvider(): AIConfig {
  debugEnv('Checking environment variables for AI providers');

  const config = buildProviderConfig();

  // Log which providers are configured (without exposing keys)
  debugEnv('OpenAI configured: %s', config.openai != null);
  debugEnv('Anthropic configured: %s', config.anthropic != null);
  debugEnv('Google configured: %s', config.google != null);
  debugEnv('XAI configured: %s', config.xai != null);
  debugEnv('Custom configured: %s', config.custom != null);

  // Log provider configurations
  logProviderConfig('OpenAI', config.openai?.apiKey);
  logProviderConfig('Anthropic', config.anthropic?.apiKey);
  logProviderConfig('Google', config.google?.apiKey);
  logProviderConfig('XAI', config.xai?.apiKey);

  if (config.custom != null) {
    debug(
      'Custom provider configured: %s at %s with model %s',
      config.custom.name,
      config.custom.baseUrl,
      config.custom.defaultModel,
    );
    logProviderConfig('Custom', config.custom.apiKey);
  }

  const configuredProviders = [config.openai, config.anthropic, config.google, config.xai, config.custom].filter(
    (p) => p != null,
  );

  if (configuredProviders.length === 0) {
    debug('ERROR: No AI providers configured');
    throw new Error(
      'At least one AI provider must be configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY environment variables, or configure a custom provider with CUSTOM_PROVIDER_NAME, CUSTOM_PROVIDER_BASE_URL, CUSTOM_PROVIDER_API_KEY, and CUSTOM_PROVIDER_DEFAULT_MODEL.',
    );
  }

  debug('AI configuration complete - %d provider(s) available', configuredProviders.length);

  return config;
}
