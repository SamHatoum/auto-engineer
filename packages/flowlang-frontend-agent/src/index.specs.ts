import { describe, it, expect, vi } from 'vitest';
import { main } from './index';

describe('Frontend Agent', () => {
  it('should log a message', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    main();
    expect(consoleSpy).toHaveBeenCalledWith('Flowlang Frontend Agent is running!');
  });
}); 