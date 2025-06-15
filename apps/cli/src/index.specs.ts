import { describe, it, expect } from 'vitest';
import { main } from './index';

describe('CLI', () => {
  it('should return the correct message', () => {
    expect(main()).toBe('CLI is running!');
  });
}); 