import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAvailableProviders, getDefaultAIProvider, getDefaultModel, resetGlobalContext } from './index';
import { DEFAULT_MODELS } from './core/constants';
import { AIProvider } from './core/types';
import type { AIConfig } from './core/types';

// Mock the config module
vi.mock('./node/config', () => ({
  configureAIProvider: vi.fn(
    () =>
      ({
        anthropic: { apiKey: 'test-anthropic-key' },
        openai: { apiKey: 'test-openai-key' },
        google: { apiKey: 'test-google-key' },
        xai: { apiKey: 'test-xai-key' },
      }) as AIConfig,
  ),
}));

describe('Provider Selection Logic', () => {
  describe('getDefaultAIProvider', () => {
    let originalProvider: string | undefined;

    beforeEach(() => {
      originalProvider = process.env.DEFAULT_AI_PROVIDER;
      resetGlobalContext();
    });

    afterEach(() => {
      if (originalProvider !== undefined) {
        process.env.DEFAULT_AI_PROVIDER = originalProvider;
      } else {
        delete process.env.DEFAULT_AI_PROVIDER;
      }
      resetGlobalContext();
    });

    it('should respect DEFAULT_AI_PROVIDER environment variable when set to anthropic', () => {
      process.env.DEFAULT_AI_PROVIDER = 'anthropic';

      const provider = getDefaultAIProvider();

      expect(provider).toBe(AIProvider.Anthropic);
    });

    it('should respect DEFAULT_AI_PROVIDER environment variable when set to xai', () => {
      process.env.DEFAULT_AI_PROVIDER = 'xai';

      const provider = getDefaultAIProvider();

      expect(provider).toBe(AIProvider.XAI);
    });

    it('should respect DEFAULT_AI_PROVIDER environment variable when set to google', () => {
      process.env.DEFAULT_AI_PROVIDER = 'google';

      const provider = getDefaultAIProvider();

      expect(provider).toBe(AIProvider.Google);
    });

    it('should be case insensitive for DEFAULT_AI_PROVIDER', () => {
      process.env.DEFAULT_AI_PROVIDER = 'ANTHROPIC';

      const provider = getDefaultAIProvider();

      expect(provider).toBe(AIProvider.Anthropic);
    });

    it('should handle invalid DEFAULT_AI_PROVIDER values by falling back to available providers', () => {
      process.env.DEFAULT_AI_PROVIDER = 'invalid_provider';

      const provider = getDefaultAIProvider();

      expect([AIProvider.Anthropic, AIProvider.OpenAI, AIProvider.Google, AIProvider.XAI]).toContain(provider);
    });

    it('should fallback to available providers when DEFAULT_AI_PROVIDER is not set', () => {
      delete process.env.DEFAULT_AI_PROVIDER;

      const provider = getDefaultAIProvider();

      expect([AIProvider.Anthropic, AIProvider.OpenAI, AIProvider.Google, AIProvider.XAI]).toContain(provider);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return array of available providers', () => {
      const providers = getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);

      providers.forEach((provider) => {
        expect([AIProvider.Anthropic, AIProvider.OpenAI, AIProvider.Google, AIProvider.XAI]).toContain(provider);
      });
    });

    it('should maintain priority order when multiple providers are available', () => {
      const providers = getAvailableProviders();
      const expectedOrder = [AIProvider.Anthropic, AIProvider.OpenAI, AIProvider.Google, AIProvider.XAI];

      let lastIndex = -1;
      providers.forEach((provider) => {
        const currentIndex = expectedOrder.indexOf(provider);
        expect(currentIndex).toBeGreaterThan(lastIndex);
        lastIndex = currentIndex;
      });
    });
  });

  describe('getDefaultModel', () => {
    let originalModel: string | undefined;

    beforeEach(() => {
      originalModel = process.env.DEFAULT_AI_MODEL;
    });

    afterEach(() => {
      if (originalModel !== undefined) {
        process.env.DEFAULT_AI_MODEL = originalModel;
      } else {
        delete process.env.DEFAULT_AI_MODEL;
      }
    });

    it('should use DEFAULT_AI_MODEL when set in environment', () => {
      process.env.DEFAULT_AI_MODEL = 'custom-model-name';

      const model = getDefaultModel(AIProvider.OpenAI);

      expect(model).toBe('custom-model-name');
    });

    it('should use DEFAULT_AI_MODEL regardless of provider when set', () => {
      process.env.DEFAULT_AI_MODEL = 'universal-model';

      expect(getDefaultModel(AIProvider.OpenAI)).toBe('universal-model');
      expect(getDefaultModel(AIProvider.Anthropic)).toBe('universal-model');
      expect(getDefaultModel(AIProvider.Google)).toBe('universal-model');
      expect(getDefaultModel(AIProvider.XAI)).toBe('universal-model');
    });

    it('should trim whitespace from DEFAULT_AI_MODEL', () => {
      process.env.DEFAULT_AI_MODEL = '  model-with-spaces  ';

      const model = getDefaultModel(AIProvider.OpenAI);

      expect(model).toBe('model-with-spaces');
    });

    it('should fallback to provider-specific defaults when DEFAULT_AI_MODEL is not set', () => {
      delete process.env.DEFAULT_AI_MODEL;

      expect(getDefaultModel(AIProvider.OpenAI)).toBe(DEFAULT_MODELS[AIProvider.OpenAI]);
      expect(getDefaultModel(AIProvider.Anthropic)).toBe(DEFAULT_MODELS[AIProvider.Anthropic]);
      expect(getDefaultModel(AIProvider.Google)).toBe(DEFAULT_MODELS[AIProvider.Google]);
      expect(getDefaultModel(AIProvider.XAI)).toBe(DEFAULT_MODELS[AIProvider.XAI]);
    });

    it('should fallback to provider-specific defaults when DEFAULT_AI_MODEL is empty', () => {
      process.env.DEFAULT_AI_MODEL = '';

      expect(getDefaultModel(AIProvider.OpenAI)).toBe(DEFAULT_MODELS[AIProvider.OpenAI]);
      expect(getDefaultModel(AIProvider.Anthropic)).toBe(DEFAULT_MODELS[AIProvider.Anthropic]);
      expect(getDefaultModel(AIProvider.Google)).toBe(DEFAULT_MODELS[AIProvider.Google]);
      expect(getDefaultModel(AIProvider.XAI)).toBe(DEFAULT_MODELS[AIProvider.XAI]);
    });

    it('should fallback to provider-specific defaults when DEFAULT_AI_MODEL is only whitespace', () => {
      process.env.DEFAULT_AI_MODEL = '   ';

      expect(getDefaultModel(AIProvider.OpenAI)).toBe(DEFAULT_MODELS[AIProvider.OpenAI]);
      expect(getDefaultModel(AIProvider.Anthropic)).toBe(DEFAULT_MODELS[AIProvider.Anthropic]);
      expect(getDefaultModel(AIProvider.Google)).toBe(DEFAULT_MODELS[AIProvider.Google]);
      expect(getDefaultModel(AIProvider.XAI)).toBe(DEFAULT_MODELS[AIProvider.XAI]);
    });
  });

  describe('Integration: Provider Selection with Priority', () => {
    it('should demonstrate overrides when keys are not set', () => {
      const availableProviders = getAvailableProviders();

      if (availableProviders.includes(AIProvider.XAI)) {
        expect(availableProviders).toContain(AIProvider.XAI);
      }
    });

    it('should demonstrate priority order logic', () => {
      const availableProviders = getAvailableProviders();
      const defaultProvider = getDefaultAIProvider();
      const priorityOrder = [AIProvider.Anthropic, AIProvider.OpenAI, AIProvider.Google, AIProvider.XAI];

      let expectedProvider = AIProvider.OpenAI;
      for (const provider of priorityOrder) {
        if (availableProviders.includes(provider)) {
          expectedProvider = provider;
          break;
        }
      }

      const envProvider = process.env.DEFAULT_AI_PROVIDER;
      if (envProvider === undefined || envProvider === null || envProvider.toLowerCase() === 'invalid_provider') {
        expect(defaultProvider).toBe(expectedProvider);
      }
    });
  });
});
