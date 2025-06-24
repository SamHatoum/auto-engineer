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

// Load configuration from environment variables
export function loadConfig(): AIConfig {
  return {
    openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : undefined,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY } : undefined,
    xai: process.env.XAI_API_KEY ? { apiKey: process.env.XAI_API_KEY } : undefined,
  };
}

// Validate that at least one provider is configured
export function validateConfig(config: AIConfig): void {
  if (!config.openai && !config.anthropic && !config.google && !config.xai) {
    throw new Error('At least one AI provider must be configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or XAI_API_KEY environment variables.');
  }
} 