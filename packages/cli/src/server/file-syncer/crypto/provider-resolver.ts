import dotenv from 'dotenv';
import { resolve } from 'path';
import crypto from 'node:crypto';

export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google',
  XAI = 'xai',
  Custom = 'custom',
}

export type ActiveProvider =
  | { provider: Exclude<AIProvider, AIProvider.Custom>; apiKey: string; model?: string }
  | {
      provider: AIProvider.Custom;
      apiKey: string;
      model?: string;
      custom: { name: string; baseUrl: string; defaultModel: string };
    };

let envLoaded = false;
function ensureEnv() {
  if (envLoaded) return;
  dotenv.config({ path: resolve(process.cwd(), '.env') });
  envLoaded = true;
}

function resolveCustom(): ActiveProvider | null {
  const name = process.env.CUSTOM_PROVIDER_NAME;
  const baseUrl = process.env.CUSTOM_PROVIDER_BASE_URL;
  const apiKey = process.env.CUSTOM_PROVIDER_API_KEY;
  const defaultModel = process.env.CUSTOM_PROVIDER_DEFAULT_MODEL;
  if (
    name !== undefined &&
    name.length > 0 &&
    baseUrl !== undefined &&
    baseUrl.length > 0 &&
    apiKey !== undefined &&
    apiKey.length > 0 &&
    defaultModel !== undefined &&
    defaultModel.length > 0
  ) {
    return { provider: AIProvider.Custom, apiKey, custom: { name, baseUrl, defaultModel } };
  }
  return null;
}

export function getActiveProvider(): ActiveProvider | null {
  ensureEnv();
  const model = process.env.DEFAULT_AI_MODEL ?? undefined;

  const probes: Array<[Exclude<AIProvider, AIProvider.Custom>, string]> = [
    [AIProvider.Anthropic, 'ANTHROPIC_API_KEY'],
    [AIProvider.OpenAI, 'OPENAI_API_KEY'],
    [AIProvider.Google, 'GEMINI_API_KEY'],
    [AIProvider.XAI, 'XAI_API_KEY'],
  ];

  for (const [provider, envVar] of probes) {
    const apiKey = process.env[envVar];
    if (apiKey !== undefined) return { provider, apiKey, model };
  }

  const custom = resolveCustom();
  if (custom !== null) return { ...custom, model };

  return null;
}

export function getProviderEnvHash(): string {
  ensureEnv();
  const keys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'XAI_API_KEY',
    'CUSTOM_PROVIDER_NAME',
    'CUSTOM_PROVIDER_BASE_URL',
    'CUSTOM_PROVIDER_API_KEY',
    'CUSTOM_PROVIDER_DEFAULT_MODEL',
    'DEFAULT_AI_MODEL',
  ];
  const joined = keys.map((k) => process.env[k] ?? '').join('|');
  return crypto.createHash('md5').update(joined).digest('hex');
}
