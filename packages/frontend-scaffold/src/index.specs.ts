import { describe, it, expect } from 'vitest';
import { main } from './index';

describe('Frontend Scaffold', () => {
  it('should return the correct message', () => {
    expect(main()).toBe('Frontend Scaffold is running!');
  });
}); 