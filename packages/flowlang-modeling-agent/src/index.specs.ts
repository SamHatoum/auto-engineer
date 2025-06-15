import { describe, it, expect } from 'vitest';
import { main } from './index';

describe('Flowlang Modeling Agent', () => {
  it('should return the correct message', () => {
    expect(main()).toBe('Flowlang Modeling Agent is running!');
  });
}); 