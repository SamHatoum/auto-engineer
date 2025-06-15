import { describe, it, expect, vi } from 'vitest';
import { main } from './index';

describe('CLI', () => {
  it('should log a message', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    main();
    expect(consoleSpy).toHaveBeenCalledWith('CLI is running!');
  });
}); 