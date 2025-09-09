import { describe, it, expect } from 'vitest';
import { generateId } from '../src/index.js';

describe('@auto-engineer/id', () => {
  it('should generate an id with no prefix by default', () => {
    const id = generateId();
    expect(id.length).toBe(64);
    expect(id).toMatch(/^[A-Za-z0-9_-]{64}$/);
  });

  it('it should support a custom prefix', () => {
    const id = generateId({ prefix: 'AUTO-' });
    expect(id.startsWith('AUTO-')).toBe(true);
    expect(id.length).toBe(5 + 64);
  });
});
