import { describe, it, expect } from 'vitest';
import { main } from './index';

describe('Flowlang Frontend Agent', () => {
  it('should return the correct message', () => {
    expect(main()).toBe('Flowlang Frontend Agent is running!');
  });
}); 