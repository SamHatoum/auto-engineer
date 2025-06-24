import { describe, it, expect } from 'vitest';
import { generateTextWithAI, streamTextWithAI, type AIProvider } from './index';

describe('AI Integration', () => {
  it('should export the correct types', () => {
    expect(typeof generateTextWithAI).toBe('function');
    expect(typeof streamTextWithAI).toBe('function');
  });

  it('should have valid AIProvider type', () => {
    const providers: AIProvider[] = ['openai', 'anthropic', 'google', 'xai'];
    expect(providers).toHaveLength(4);
  });
}); 