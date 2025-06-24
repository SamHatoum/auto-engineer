import { describe, it, expect } from 'vitest';
import { main } from './index';

describe('Emmett Generator', () => {
  it('should return the correct message', () => {
    expect(main()).toBe('Flowlang Agent is running!');
  });
}); 