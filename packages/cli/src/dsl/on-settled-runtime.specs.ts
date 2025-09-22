import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageBusServer } from '../server/server';
import { on, dispatch, getRegistrations } from './index';
import type { Command, Event } from '@auto-engineer/message-bus';
import getPort from 'get-port';

interface CheckTestsCommand extends Command {
  type: 'CheckTests';
  data: { targetDirectory: string; scope: string };
}

interface CheckTypesCommand extends Command {
  type: 'CheckTypes';
  data: { targetDirectory: string; scope: string };
}

interface CheckLintCommand extends Command {
  type: 'CheckLint';
  data: { targetDirectory: string; scope: string; fix: boolean };
}

interface ImplementClientCommand extends Command {
  type: 'ImplementClient';
  data: { projectDir: string; iaSchemeDir: string; failures?: unknown[] };
}

describe('on.settled Runtime Execution', () => {
  let server: MessageBusServer;
  let port: number;

  beforeEach(async () => {
    getRegistrations();

    port = await getPort();
    server = new MessageBusServer({
      port,
      enableFileSync: false,
    });
  });

  afterEach(async () => {
    await server?.stop?.();
  });

  it('should wait for all specified commands to complete before executing handler', async () => {
    let settledHandlerExecuted = false;
    let receivedEvents: Record<string, Event[]> = {};

    // Set up command handlers that emit success events
    server.registerCommandHandlers([
      {
        name: 'CheckTests',
        alias: 'check:tests',
        description: 'Run Vitest test suites',
        category: 'check',
        icon: 'flask-conical',
        fields: {},
        examples: [],
        events: ['TestsCheckPassed', 'TestsCheckFailed'],
        handle: async (command: CheckTestsCommand) => {
          return {
            type: 'TestsCheckPassed',
            data: { directory: command.data.targetDirectory },
          };
        },
      },
      {
        name: 'CheckTypes',
        alias: 'check:types',
        description: 'TypeScript type checking',
        category: 'check',
        icon: 'shield-check',
        fields: {},
        examples: [],
        events: ['TypeCheckPassed', 'TypeCheckFailed'],
        handle: async (command: CheckTypesCommand) => {
          return {
            type: 'TypeCheckPassed',
            data: { directory: command.data.targetDirectory },
          };
        },
      },
      {
        name: 'CheckLint',
        alias: 'check:lint',
        description: 'ESLint with optional auto-fix',
        category: 'check',
        icon: 'sparkles',
        fields: {},
        examples: [],
        events: ['LintCheckPassed', 'LintCheckFailed'],
        handle: async (command: CheckLintCommand) => {
          return {
            type: 'LintCheckPassed',
            data: { directory: command.data.targetDirectory },
          };
        },
      },
    ]);

    // Register on.settled handler
    on.settled<CheckTestsCommand, CheckTypesCommand, CheckLintCommand>(
      ['CheckTests', 'CheckTypes', 'CheckLint'],
      (events) => {
        settledHandlerExecuted = true;
        receivedEvents = events;
      },
    );

    // Get the registrations and register them with the server
    const registrations = getRegistrations();
    for (const registration of registrations) {
      if (registration.type === 'on-settled') {
        // This should register the settled handler (currently missing implementation)
        server.registerSettledHandler(registration);
      }
    }

    await server.start();
    const bus = server.getMessageBus();
    const settledTracker = server.getSettledTracker();

    // Helper function to send command and notify settled tracker
    const sendCommand = async (command: Command) => {
      // Add correlation and request IDs if missing
      const enhancedCommand = {
        ...command,
        correlationId: command.correlationId ?? `corr-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        requestId: command.requestId ?? `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      };

      // Notify settled tracker that command started
      settledTracker.onCommandStarted(enhancedCommand);

      // Send the command
      return bus.sendCommand(enhancedCommand);
    };

    // Execute the first command
    await sendCommand({
      type: 'CheckTests',
      data: { targetDirectory: './src', scope: 'all' },
    });

    // Handler should NOT be executed yet (only 1/3 commands completed)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(settledHandlerExecuted).toBe(false);

    // Execute the second command
    await sendCommand({
      type: 'CheckTypes',
      data: { targetDirectory: './src', scope: 'all' },
    });

    // Handler should STILL NOT be executed (only 2/3 commands completed)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(settledHandlerExecuted).toBe(false);

    // Execute the third command
    await sendCommand({
      type: 'CheckLint',
      data: { targetDirectory: './src', scope: 'all', fix: false },
    });

    // NOW the handler should be executed (all 3 commands completed)
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(settledHandlerExecuted).toBe(true);

    // Verify that events from all commands were collected
    expect(receivedEvents).toHaveProperty('CheckTests');
    expect(receivedEvents).toHaveProperty('CheckTypes');
    expect(receivedEvents).toHaveProperty('CheckLint');

    expect(receivedEvents.CheckTests).toHaveLength(1);
    expect(receivedEvents.CheckTests[0].type).toBe('TestsCheckPassed');

    expect(receivedEvents.CheckTypes).toHaveLength(1);
    expect(receivedEvents.CheckTypes[0].type).toBe('TypeCheckPassed');

    expect(receivedEvents.CheckLint).toHaveLength(1);
    expect(receivedEvents.CheckLint[0].type).toBe('LintCheckPassed');
  });

  it('should collect events from failed commands as well as successful ones', async () => {
    let settledHandlerExecuted = false;
    let receivedEvents: Record<string, Event[]> = {};

    // Set up command handlers with mixed success/failure
    server.registerCommandHandlers([
      {
        name: 'CheckTests',
        alias: 'check:tests',
        description: 'Run Vitest test suites',
        category: 'check',
        icon: 'flask-conical',
        fields: {},
        examples: [],
        events: ['TestsCheckPassed', 'TestsCheckFailed'],
        handle: async (command: CheckTestsCommand) => {
          return {
            type: 'TestsCheckFailed',
            data: {
              directory: command.data.targetDirectory,
              failures: ['test1.ts:42', 'test2.ts:15'],
            },
          };
        },
      },
      {
        name: 'CheckTypes',
        alias: 'check:types',
        description: 'TypeScript type checking',
        category: 'check',
        icon: 'shield-check',
        fields: {},
        examples: [],
        events: ['TypeCheckPassed', 'TypeCheckFailed'],
        handle: async (command: CheckTypesCommand) => {
          return {
            type: 'TypeCheckPassed',
            data: { directory: command.data.targetDirectory },
          };
        },
      },
    ]);

    // Register on.settled handler
    on.settled<CheckTestsCommand, CheckTypesCommand>(['CheckTests', 'CheckTypes'], (events) => {
      settledHandlerExecuted = true;
      receivedEvents = events;
    });

    // Register with server (this will fail until we implement registerSettledHandler)
    const registrations = getRegistrations();
    for (const registration of registrations) {
      if (registration.type === 'on-settled') {
        server.registerSettledHandler(registration);
      }
    }

    await server.start();
    const bus = server.getMessageBus();

    // Execute both commands
    await bus.sendCommand({
      type: 'CheckTests',
      data: { targetDirectory: './src', scope: 'all' },
    });

    await bus.sendCommand({
      type: 'CheckTypes',
      data: { targetDirectory: './src', scope: 'all' },
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Handler should execute even with mixed success/failure
    expect(settledHandlerExecuted).toBe(true);

    // Should have collected events from both commands
    expect(receivedEvents.CheckTests[0].type).toBe('TestsCheckFailed');
    expect(receivedEvents.CheckTypes[0].type).toBe('TypeCheckPassed');
  });

  it('should support the enhanced API with dispatches and type-safe dispatch function', async () => {
    let dispatchFunctionCalled = false;
    let implementClientCommandDispatched = false;

    // Set up command handlers
    server.registerCommandHandlers([
      {
        name: 'CheckTests',
        alias: 'check:tests',
        description: 'Run Vitest test suites',
        category: 'check',
        icon: 'flask-conical',
        fields: {},
        examples: [],
        events: ['TestsCheckPassed', 'TestsCheckFailed'],
        handle: async () => ({ type: 'TestsCheckPassed', data: {} }),
      },
      {
        name: 'CheckTypes',
        alias: 'check:types',
        description: 'TypeScript type checking',
        category: 'check',
        icon: 'shield-check',
        fields: {},
        examples: [],
        events: ['TypeCheckPassed', 'TypeCheckFailed'],
        handle: async () => ({ type: 'TypeCheckPassed', data: {} }),
      },
      {
        name: 'ImplementClient',
        alias: 'implement:client',
        description: 'AI implements client',
        category: 'implement',
        icon: 'code',
        fields: {},
        examples: [],
        events: ['ClientImplemented', 'ClientImplementationFailed'],
        handle: async (command: ImplementClientCommand) => {
          implementClientCommandDispatched = true;
          return {
            type: 'ClientImplemented',
            data: { projectDir: command.data.projectDir },
          };
        },
      },
    ]);

    // Register on.settled with enhanced API
    on.settled<CheckTestsCommand, CheckTypesCommand>(
      ['CheckTests', 'CheckTypes'],
      dispatch<ImplementClientCommand>(['ImplementClient'], (events, send) => {
        dispatchFunctionCalled = true;

        const hasFailures =
          events.CheckTests.some((e) => e.type === 'TestsCheckFailed') ||
          events.CheckTypes.some((e) => e.type === 'TypeCheckFailed');

        if (!hasFailures) {
          send({
            type: 'ImplementClient',
            data: {
              projectDir: './client',
              iaSchemeDir: './.context',
            },
          });
        }
      }),
    );

    // Register with server
    const registrations = getRegistrations();
    for (const registration of registrations) {
      if (registration.type === 'on-settled') {
        server.registerSettledHandler(registration);
      }
    }

    await server.start();
    const bus = server.getMessageBus();

    // Execute the prerequisite commands
    await bus.sendCommand({
      type: 'CheckTests',
      data: { targetDirectory: './src', scope: 'all' },
    });

    await bus.sendCommand({
      type: 'CheckTypes',
      data: { targetDirectory: './src', scope: 'all' },
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Both the settled handler and the dispatched command should have executed
    expect(dispatchFunctionCalled).toBe(true);
    expect(implementClientCommandDispatched).toBe(true);
  });

  it('should handle events from commands', async () => {
    let settledHandlerExecuted = false;
    let receivedEvents: Record<string, Event[]> = {};

    // Command handler that returns completion event
    server.registerCommandHandlers([
      {
        name: 'CheckTests',
        alias: 'check:tests',
        description: 'Run Vitest test suites',
        category: 'check',
        icon: 'flask-conical',
        fields: {},
        examples: [],
        events: ['TestsCheckPassed', 'TestsCheckFailed'],
        handle: async (command: CheckTestsCommand) => {
          return {
            type: 'TestsCheckPassed',
            data: { directory: command.data.targetDirectory },
          };
        },
      },
    ]);

    // Register on.settled handler for single command
    on.settled<CheckTestsCommand>(['CheckTests'], (events) => {
      settledHandlerExecuted = true;
      receivedEvents = events;
    });

    // Register with server
    const registrations = getRegistrations();
    for (const registration of registrations) {
      if (registration.type === 'on-settled') {
        server.registerSettledHandler(registration);
      }
    }

    await server.start();
    const bus = server.getMessageBus();

    // Execute the command
    await bus.sendCommand({
      type: 'CheckTests',
      data: { targetDirectory: './src', scope: 'all' },
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Handler should execute
    expect(settledHandlerExecuted).toBe(true);

    // Should collect all events from the command
    expect(receivedEvents.CheckTests).toHaveLength(1);
    expect(receivedEvents.CheckTests.map((e) => e.type)).toContain('TestsCheckPassed');
  });

  it('should timeout if commands never complete', async () => {
    let settledHandlerExecuted = false;
    let timeoutHandlerExecuted = false;

    // Register on.settled (timeout API is a future enhancement)
    on.settled<CheckTestsCommand, CheckTypesCommand>(['CheckTests', 'CheckTypes'], (_events) => {
      settledHandlerExecuted = true;
    });

    // Simulate timeout behavior manually for this test
    setTimeout(() => {
      if (!settledHandlerExecuted) {
        timeoutHandlerExecuted = true;
      }
    }, 500);

    // Set up command handler for the timeout test
    server.registerCommandHandlers([
      {
        name: 'CheckTests',
        alias: 'check:tests',
        description: 'Run Vitest test suites',
        category: 'check',
        icon: 'flask-conical',
        fields: {},
        examples: [],
        events: ['TestsCheckPassed', 'TestsCheckFailed'],
        handle: async () => {
          return {
            type: 'TestsCheckPassed',
            data: {},
          };
        },
      },
    ]);

    // Register with server
    const registrations = getRegistrations();
    for (const registration of registrations) {
      if (registration.type === 'on-settled') {
        server.registerSettledHandler(registration);
      }
    }

    await server.start();
    const bus = server.getMessageBus();

    // Execute only one command (CheckTypes never executed)
    await bus.sendCommand({
      type: 'CheckTests',
      data: { targetDirectory: './src', scope: 'all' },
    });

    // Wait longer than the timeout
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Settled handler should NOT execute, but timeout handler should
    expect(settledHandlerExecuted).toBe(false);
    expect(timeoutHandlerExecuted).toBe(true);
  });
});
