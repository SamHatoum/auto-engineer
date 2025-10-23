import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIProvider } from './core/types';
import { getAvailableProviders, getDefaultModel, getDefaultAIProvider, resetGlobalContext } from './index';

// Mock the config module
vi.mock('./node/config', () => ({
  configureAIProvider: vi.fn(),
}));

// Mock the custom provider
vi.mock('./core/providers/custom', () => ({
  createCustomProvider: vi.fn(() => ({
    languageModel: vi.fn(),
  })),
}));

describe('Index Integration with Custom Providers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    resetGlobalContext();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetGlobalContext();
  });

  describe('getAvailableProviders', () => {
    it('should include custom provider when configured', async () => {
      const { configureAIProvider } = await import('./node/config');
      vi.mocked(configureAIProvider).mockReturnValue({
        custom: {
          name: 'litellm',
          baseUrl: 'https://api.litellm.ai',
          apiKey: 'sk-key',
          defaultModel: 'claude-3-sonnet',
        },
        anthropic: { apiKey: 'sk-anthropic' },
      });

      const providers = getAvailableProviders();

      expect(providers).toContain(AIProvider.Custom);
      expect(providers).toContain(AIProvider.Anthropic);
    });

    it('should not include custom provider when not configured', async () => {
      const { configureAIProvider } = await import('./node/config');
      vi.mocked(configureAIProvider).mockReturnValue({
        anthropic: { apiKey: 'sk-anthropic' },
      });

      const providers = getAvailableProviders();

      expect(providers).not.toContain(AIProvider.Custom);
      expect(providers).toContain(AIProvider.Anthropic);
    });

    it('should handle multiple providers including custom', async () => {
      const { configureAIProvider } = await import('./node/config');
      vi.mocked(configureAIProvider).mockReturnValue({
        openai: { apiKey: 'sk-openai' },
        anthropic: { apiKey: 'sk-anthropic' },
        google: { apiKey: 'sk-google' },
        xai: { apiKey: 'sk-xai' },
        custom: {
          name: 'custom',
          baseUrl: 'https://api.custom.com',
          apiKey: 'sk-custom',
          defaultModel: 'custom-model',
        },
      });

      const providers = getAvailableProviders();

      expect(providers).toHaveLength(5);
      expect(providers).toContain(AIProvider.OpenAI);
      expect(providers).toContain(AIProvider.Anthropic);
      expect(providers).toContain(AIProvider.Google);
      expect(providers).toContain(AIProvider.XAI);
      expect(providers).toContain(AIProvider.Custom);
    });
  });

  describe('getDefaultModel', () => {
    it('should return custom provider default model when provider is Custom', async () => {
      const { configureAIProvider } = await import('./node/config');
      vi.mocked(configureAIProvider).mockReturnValue({
        custom: {
          name: 'litellm',
          baseUrl: 'https://api.litellm.ai',
          apiKey: 'sk-key',
          defaultModel: 'claude-3-sonnet',
        },
      });

      const model = getDefaultModel(AIProvider.Custom);
      expect(model).toBe('claude-3-sonnet');
    });

    it('should throw error when custom provider not configured but requested', async () => {
      const { configureAIProvider } = await import('./node/config');
      vi.mocked(configureAIProvider).mockReturnValue({
        anthropic: { apiKey: 'sk-anthropic' },
      });

      expect(() => getDefaultModel(AIProvider.Custom)).toThrow('Custom provider not configured');
    });

    it('should use environment variable DEFAULT_AI_MODEL for custom provider', async () => {
      process.env.DEFAULT_AI_MODEL = 'env-override-model';

      const { configureAIProvider } = await import('./node/config');
      vi.mocked(configureAIProvider).mockReturnValue({
        custom: {
          name: 'custom',
          baseUrl: 'https://api.custom.com',
          apiKey: 'sk-key',
          defaultModel: 'config-model',
        },
      });

      const model = getDefaultModel(AIProvider.Custom);
      expect(model).toBe('env-override-model');
    });

    it('should handle different custom provider models', async () => {
      const testCases = ['gpt-4o', 'claude-3-opus', 'llama3.1:70b', 'mistral-large', 'gemini-1.5-pro'];

      const { configureAIProvider } = await import('./node/config');

      testCases.forEach((testModel) => {
        resetGlobalContext();
        vi.mocked(configureAIProvider).mockReturnValue({
          custom: {
            name: 'test',
            baseUrl: 'https://api.test.com',
            apiKey: 'sk-key',
            defaultModel: testModel,
          },
        });

        const model = getDefaultModel(AIProvider.Custom);
        expect(model).toBe(testModel);
      });
    });
  });

  describe('getDefaultAIProvider', () => {
    it('should use custom provider as fallback when available', async () => {
      process.env.DEFAULT_AI_PROVIDER = 'nonexistent';

      const { configureAIProvider } = await import('./node/config');
      vi.mocked(configureAIProvider).mockReturnValue({
        custom: {
          name: 'custom',
          baseUrl: 'https://api.custom.com',
          apiKey: 'sk-key',
          defaultModel: 'custom-model',
        },
      });

      // Mock getAvailableProviders to return custom
      const mockGetAvailableProviders = vi.fn(() => [AIProvider.Custom]);
      vi.doMock('./index', async () => ({
        ...(await vi.importActual('./index')),
        getAvailableProviders: mockGetAvailableProviders,
      }));

      const { getDefaultAIProvider: getDefaultAIProviderMocked } = await import('./index');
      const provider = getDefaultAIProviderMocked();

      expect(provider).toBe(AIProvider.Custom);
    });

    it('should respect explicit DEFAULT_AI_PROVIDER environment variable', () => {
      const testCases = [
        { env: 'openai', expected: AIProvider.OpenAI },
        { env: 'anthropic', expected: AIProvider.Anthropic },
        { env: 'google', expected: AIProvider.Google },
        { env: 'xai', expected: AIProvider.XAI },
      ];

      testCases.forEach(({ env, expected }) => {
        resetGlobalContext();
        process.env.DEFAULT_AI_PROVIDER = env;
        const provider = getDefaultAIProvider();
        expect(provider).toBe(expected);
      });
    });
  });
});
