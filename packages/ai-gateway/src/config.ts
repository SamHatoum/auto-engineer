import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

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
}

export function configureAIProvider(): AIConfig {
  const config = {
    openai: process.env.OPENAI_API_KEY != null ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY != null ? { apiKey: process.env.ANTHROPIC_API_KEY } : undefined,
    google:
      process.env.GOOGLE_GENERATIVE_AI_API_KEY != null
        ? { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }
        : undefined,
    xai: process.env.XAI_API_KEY != null ? { apiKey: process.env.XAI_API_KEY } : undefined,
  };
  if (config.openai == null && config.anthropic == null && config.google == null && config.xai == null) {
    throw new Error(
      'At least one AI provider must be configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or XAI_API_KEY environment variables.',
    );
  }
  return config;
}
