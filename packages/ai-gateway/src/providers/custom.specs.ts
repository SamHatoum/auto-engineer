import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomProvider } from '../core/providers/custom';
import { CustomProviderConfig } from '../core/types';

interface MockConfig {
  name: string;
  baseURL: string;
  apiKey: string;
}

// Mock the createOpenAI function
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn((config: MockConfig) => ({
    languageModel: vi.fn((modelId: string) => ({
      modelId,
      provider: config.name,
      specificationVersion: 'v1' as const,
      defaultObjectGenerationMode: 'json' as const,
    })),
  })),
}));

describe('Custom Provider', () => {
  const mockConfig: CustomProviderConfig = {
    name: 'test-provider',
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'test-api-key',
    defaultModel: 'test-model',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCustomProvider', () => {
    it('should create a custom provider with the correct configuration', () => {
      const provider = createCustomProvider(mockConfig);

      expect(provider).toBeDefined();
      // Provider creation should succeed with valid config
    });

    it('should call createOpenAI with the correct parameters', async () => {
      const { createOpenAI } = await import('@ai-sdk/openai');

      createCustomProvider(mockConfig);

      expect(createOpenAI).toHaveBeenCalledWith({
        name: mockConfig.name,
        baseURL: mockConfig.baseUrl,
        apiKey: mockConfig.apiKey,
      });
    });

    it('should create a provider that can create language models', () => {
      const provider = createCustomProvider(mockConfig);
      const model = provider.languageModel('test-model');

      expect(model).toBeDefined();
      expect(model.modelId).toBe('test-model');
      expect(model.provider).toBe(mockConfig.name);
    });

    it('should handle different base URLs correctly', () => {
      const configs = [
        { ...mockConfig, baseUrl: 'https://api.litellm.ai' },
        { ...mockConfig, baseUrl: 'http://localhost:8000' },
        { ...mockConfig, baseUrl: 'https://custom-llm.company.com/api' },
      ];

      configs.forEach((config) => {
        const provider = createCustomProvider(config);
        expect(provider).toBeDefined();
      });
    });

    it('should handle different provider names', () => {
      const configs = [
        { ...mockConfig, name: 'litellm' },
        { ...mockConfig, name: 'local-llm' },
        { ...mockConfig, name: 'company-custom-llm' },
      ];

      configs.forEach((config) => {
        const provider = createCustomProvider(config);
        expect(provider).toBeDefined();
      });
    });
  });

  describe('provider compatibility', () => {
    it('should be compatible with OpenAI-style endpoints', () => {
      const litellmConfig: CustomProviderConfig = {
        name: 'litellm',
        baseUrl: 'https://api.litellm.ai/chat/completions',
        apiKey: 'sk-litellm-key',
        defaultModel: 'claude-3-sonnet',
      };

      const provider = createCustomProvider(litellmConfig);
      expect(provider).toBeDefined();
    });

    it('should work with localhost endpoints for development', () => {
      const localConfig: CustomProviderConfig = {
        name: 'local-dev',
        baseUrl: 'http://localhost:8000',
        apiKey: 'local-key',
        defaultModel: 'local-model',
      };

      const provider = createCustomProvider(localConfig);
      expect(provider).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should pass through any errors from createOpenAI', async () => {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const mockError = new Error('Invalid API key');

      vi.mocked(createOpenAI).mockImplementationOnce(() => {
        throw mockError;
      });

      expect(() => createCustomProvider(mockConfig)).toThrow('Invalid API key');
    });
  });

  describe('configuration validation', () => {
    it('should handle minimal required configuration', () => {
      const minimalConfig: CustomProviderConfig = {
        name: 'minimal',
        baseUrl: 'https://api.example.com',
        apiKey: 'key',
        defaultModel: 'model',
      };

      const provider = createCustomProvider(minimalConfig);
      expect(provider).toBeDefined();
    });

    it('should preserve all configuration properties', async () => {
      const fullConfig: CustomProviderConfig = {
        name: 'full-config',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-test-key-123',
        defaultModel: 'gpt-4o',
      };

      createCustomProvider(fullConfig);

      const { createOpenAI } = await import('@ai-sdk/openai');
      expect(createOpenAI).toHaveBeenCalledWith({
        name: fullConfig.name,
        baseURL: fullConfig.baseUrl,
        apiKey: fullConfig.apiKey,
      });
    });
  });
});
