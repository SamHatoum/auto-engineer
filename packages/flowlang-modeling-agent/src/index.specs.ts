import { describe, it, expect, vi } from 'vitest';
import { main } from './index';

describe('Modeling Agent', () => {
  it('should log a message', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    main();
    expect(consoleSpy).toHaveBeenCalledWith('Flowlang Modeling Agent is running!');
  });
}); 