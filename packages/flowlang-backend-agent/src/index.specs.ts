import { describe, it, expect } from 'vitest';
import { main } from './index';

describe('Flowlang Backend Agent', () => {
  it('should return the correct message', () => {
    expect(main()).toBe('Flowlang Backend Agent is running!');
  });
}); 