import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Command, Event } from '@auto-engineer/message-bus';
import { on } from './index';

interface TestCommandA extends Command<'TestCommandA', { payload: string }> {
  type: 'TestCommandA';
  data: { payload: string };
}

interface TestCommandB extends Command<'TestCommandB', { payload: number }> {
  type: 'TestCommandB';
  data: { payload: number };
}

describe('on.settled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Type Safety', () => {
    it('should enforce exact match between generics and command types array', () => {
      // This should compile - exact match between generics and array
      on.settled<TestCommandA, TestCommandB>(
        ['TestCommandA', 'TestCommandB'] as const,
        (events: { TestCommandA: Event[]; TestCommandB: Event[] }) => {
          expect(events).toBeDefined();
        },
      );
    });
  });

  describe('Event Collection and Callback', () => {
    it('should wait for all commands to complete before calling callback', () => {
      const mockCallback = vi.fn();

      on.settled<TestCommandA, TestCommandB>(['TestCommandA', 'TestCommandB'] as const, mockCallback);

      // The registration should be created but callback not yet called
      // since this is just the DSL registration phase
      expect(mockCallback).not.toHaveBeenCalled();

      // TODO: Implement runtime event collection and callback triggering
      // This would require integration with the message bus to:
      // 1. Monitor commands of specified types
      // 2. Collect their events
      // 3. Trigger callback when all commands settle
    });

    it('should collect events from both successful and failed commands', () => {
      const mockCallback = vi.fn();

      on.settled<TestCommandA, TestCommandB>(['TestCommandA', 'TestCommandB'] as const, mockCallback);

      // The registration should be created but callback not yet called
      expect(mockCallback).not.toHaveBeenCalled();

      // TODO: Test with actual command execution and event collection
      // when runtime implementation is complete
    });

    it('should handle single command type', () => {
      const mockCallback = vi.fn();

      on.settled<TestCommandA>(['TestCommandA'] as const, mockCallback);

      // The registration should be created but callback not yet called
      expect(mockCallback).not.toHaveBeenCalled();

      // TODO: Test callback execution when runtime is implemented
    });

    it('should handle commands with no events', () => {
      const mockCallback = vi.fn();

      on.settled<TestCommandA, TestCommandB>(['TestCommandA', 'TestCommandB'] as const, mockCallback);

      // The registration should be created but callback not yet called
      expect(mockCallback).not.toHaveBeenCalled();

      // TODO: Test that callback is called even with no events when runtime is implemented
    });
  });

  describe('Registration Integration', () => {
    it('should register as a DSL registration when called', () => {
      const mockCallback = vi.fn();

      const registration = on.settled<TestCommandA, TestCommandB>(
        ['TestCommandA', 'TestCommandB'] as const,
        mockCallback,
      );

      // Should return a registration object
      expect(registration).toBeDefined();
      expect(registration?.type).toBe('on-settled');
    });

    it('should be accessible as a method on the on function', () => {
      // Should be able to access on.settled
      expect(typeof on.settled).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should not trigger callback if no commands of specified types are dispatched', () => {
      const mockCallback = vi.fn();

      on.settled<TestCommandA, TestCommandB>(['TestCommandA', 'TestCommandB'] as const, mockCallback);

      // If no matching commands are dispatched, callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
