import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureAIProvider } from './config';

// Mock environment variables
const originalEnv = process.env;

describe('AI Configuration with Custom Providers', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear all AI-related environment variables for clean test state
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('configureAIProvider', () => {
    it('should configure custom provider when all environment variables are set', () => {
      process.env.CUSTOM_PROVIDER_NAME = 'litellm';
      process.env.CUSTOM_PROVIDER_BASE_URL = 'https://api.litellm.ai';
      process.env.CUSTOM_PROVIDER_API_KEY = 'sk-litellm-key';
      process.env.CUSTOM_PROVIDER_DEFAULT_MODEL = 'claude-3-sonnet';

      const config = configureAIProvider();

      expect(config.custom).toBeDefined();
      expect(config.custom?.name).toBe('litellm');
      expect(config.custom?.baseUrl).toBe('https://api.litellm.ai');
      expect(config.custom?.apiKey).toBe('sk-litellm-key');
      expect(config.custom?.defaultModel).toBe('claude-3-sonnet');
    });

    it('should not configure custom provider when environment variables are missing', () => {
      // Only set some environment variables
      process.env.CUSTOM_PROVIDER_NAME = 'incomplete';
      process.env.CUSTOM_PROVIDER_BASE_URL = 'https://api.example.com';
      process.env.ANTHROPIC_API_KEY = 'sk-test'; // Need at least one provider
      // Missing CUSTOM_PROVIDER_API_KEY and CUSTOM_PROVIDER_DEFAULT_MODEL

      const config = configureAIProvider();
      expect(config.custom).toBeUndefined();
    });

    it('should handle multiple providers including custom', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-key';
      process.env.ANTHROPIC_API_KEY = 'sk-anthropic-key';
      process.env.CUSTOM_PROVIDER_NAME = 'custom';
      process.env.CUSTOM_PROVIDER_BASE_URL = 'https://api.custom.com';
      process.env.CUSTOM_PROVIDER_API_KEY = 'custom-key';
      process.env.CUSTOM_PROVIDER_DEFAULT_MODEL = 'custom-model';

      const config = configureAIProvider();

      expect(config.openai).toBeDefined();
      expect(config.anthropic).toBeDefined();
      expect(config.custom).toBeDefined();
    });

    it('should work with only custom provider configured', () => {
      process.env.CUSTOM_PROVIDER_NAME = 'only-custom';
      process.env.CUSTOM_PROVIDER_BASE_URL = 'https://api.only-custom.com';
      process.env.CUSTOM_PROVIDER_API_KEY = 'only-custom-key';
      process.env.CUSTOM_PROVIDER_DEFAULT_MODEL = 'only-custom-model';

      const config = configureAIProvider();

      expect(config.custom).toBeDefined();
      expect(config.openai).toBeUndefined();
      expect(config.anthropic).toBeUndefined();
      expect(config.google).toBeUndefined();
      expect(config.xai).toBeUndefined();
    });

    it('should throw error when no providers are configured', () => {
      // Clear all environment variables
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.XAI_API_KEY;
      delete process.env.CUSTOM_PROVIDER_NAME;
      delete process.env.CUSTOM_PROVIDER_BASE_URL;
      delete process.env.CUSTOM_PROVIDER_API_KEY;
      delete process.env.CUSTOM_PROVIDER_DEFAULT_MODEL;

      expect(() => configureAIProvider()).toThrow(/At least one AI provider must be configured/);
    });

    it('should handle custom provider with different configurations', () => {
      const testCases = [
        {
          name: 'litellm-proxy',
          baseUrl: 'https://litellm-proxy.company.com/v1',
          model: 'gpt-4o-mini',
        },
        {
          name: 'local-ollama',
          baseUrl: 'http://localhost:11434/v1',
          model: 'llama3.1:8b',
        },
        {
          name: 'azure-openai',
          baseUrl: 'https://company.openai.azure.com/openai/deployments',
          model: 'gpt-4',
        },
      ];

      testCases.forEach((testCase) => {
        process.env.CUSTOM_PROVIDER_NAME = testCase.name;
        process.env.CUSTOM_PROVIDER_BASE_URL = testCase.baseUrl;
        process.env.CUSTOM_PROVIDER_API_KEY = 'test-key';
        process.env.CUSTOM_PROVIDER_DEFAULT_MODEL = testCase.model;

        const config = configureAIProvider();

        expect(config.custom?.name).toBe(testCase.name);
        expect(config.custom?.baseUrl).toBe(testCase.baseUrl);
        expect(config.custom?.defaultModel).toBe(testCase.model);
      });
    });

    it('should handle empty string environment variables as undefined', () => {
      process.env.CUSTOM_PROVIDER_NAME = '';
      process.env.CUSTOM_PROVIDER_BASE_URL = '';
      process.env.CUSTOM_PROVIDER_API_KEY = '';
      process.env.CUSTOM_PROVIDER_DEFAULT_MODEL = '';
      process.env.ANTHROPIC_API_KEY = 'sk-test'; // Need at least one provider

      const config = configureAIProvider();
      expect(config.custom).toBeUndefined();
    });

    it('should handle whitespace in environment variables', () => {
      process.env.CUSTOM_PROVIDER_NAME = ' litellm ';
      process.env.CUSTOM_PROVIDER_BASE_URL = ' https://api.litellm.ai ';
      process.env.CUSTOM_PROVIDER_API_KEY = ' sk-key ';
      process.env.CUSTOM_PROVIDER_DEFAULT_MODEL = ' claude-3-sonnet ';

      const config = configureAIProvider();

      expect(config.custom?.name).toBe(' litellm ');
      expect(config.custom?.baseUrl).toBe(' https://api.litellm.ai ');
      expect(config.custom?.apiKey).toBe(' sk-key ');
      expect(config.custom?.defaultModel).toBe(' claude-3-sonnet ');
    });
  });
});
