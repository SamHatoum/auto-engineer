import { z } from 'zod';

export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google',
  XAI = 'xai',
  Custom = 'custom',
}

export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

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

export interface AIContext {
  config: AIConfig;
  defaultProvider?: AIProvider;
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

export interface AIToolValidationError extends Error {
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

export type RegisteredToolForAI = {
  description: string;
  parameters: z.ZodSchema;
  execute?: (args: Record<string, unknown>) => Promise<string>;
};
