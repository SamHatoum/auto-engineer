import { describe, it, expect } from 'vitest';
import { generateTextWithAI, streamTextWithAI, AIProvider } from './index';

describe('AI Integration', () => {
  process.env.OPENAI_API_KEY = 'test';

  it('should export the correct types', () => {
    expect(typeof generateTextWithAI).toBe('function');
    expect(typeof streamTextWithAI).toBe('function');
  });

  it('should have valid AIProvider type', () => {
    const providers: AIProvider[] = [AIProvider.OpenAI, AIProvider.Anthropic, AIProvider.Google, AIProvider.XAI];
    expect(providers).toContain(AIProvider.OpenAI);
  });
}); 