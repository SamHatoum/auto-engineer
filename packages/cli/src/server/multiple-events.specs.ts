import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageBusServer } from './server';
import type { Command, Event } from '@auto-engineer/message-bus';
import getPort from 'get-port';

describe('Message Bus Multiple Events Integration', () => {
  let server: MessageBusServer;
  let port: number;
  const capturedEvents: Event[] = [];

  beforeEach(async () => {
    capturedEvents.length = 0; // Clear events array
    port = await getPort();
    server = new MessageBusServer({
      port,
      enableFileSync: false,
    });
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should handle command handlers that return multiple events', async () => {
    await server.start();

    // Register a command handler that returns multiple events
    server.registerCommandHandlers([
      {
        name: 'MultiEventCommand',
        handle: async (command: Command) => {
          const baseCorrelationId = command.correlationId ?? 'test-correlation';
          const baseRequestId = command.requestId ?? 'test-request';

          return [
            {
              type: 'StepStarted',
              data: { step: 1, message: 'Starting process' },
              correlationId: baseCorrelationId,
              requestId: baseRequestId,
              timestamp: new Date(),
            },
            {
              type: 'StepCompleted',
              data: { step: 1, result: 'success' },
              correlationId: baseCorrelationId,
              requestId: baseRequestId,
              timestamp: new Date(),
            },
            {
              type: 'StepStarted',
              data: { step: 2, message: 'Finalizing' },
              correlationId: baseCorrelationId,
              requestId: baseRequestId,
              timestamp: new Date(),
            },
            {
              type: 'ProcessCompleted',
              data: { totalSteps: 2, duration: 100 },
              correlationId: baseCorrelationId,
              requestId: baseRequestId,
              timestamp: new Date(),
            },
          ];
        },
      },
    ]);

    // Set up event capture
    server.subscribeToAllEvents((event: Event) => {
      capturedEvents.push(event);
    });

    // Send command via HTTP
    const response = await fetch(`http://localhost:${port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'MultiEventCommand',
        data: { testData: 'example' },
        correlationId: 'test-corr-123',
        requestId: 'test-req-456',
      }),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.status).toBe('ack');

    // Wait for events to be processed
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify all 4 events were published
    expect(capturedEvents).toHaveLength(4);

    // Verify event types are in correct order
    expect(capturedEvents[0].type).toBe('StepStarted');
    expect(capturedEvents[1].type).toBe('StepCompleted');
    expect(capturedEvents[2].type).toBe('StepStarted');
    expect(capturedEvents[3].type).toBe('ProcessCompleted');

    // Verify correlation IDs are maintained
    capturedEvents.forEach((event) => {
      expect(event.correlationId).toBe('test-corr-123');
      expect(event.requestId).toBe('test-req-456');
    });

    // Verify step data is correct
    expect(capturedEvents[0].data.step).toBe(1);
    expect(capturedEvents[0].data.message).toBe('Starting process');
    expect(capturedEvents[2].data.step).toBe(2);
    expect(capturedEvents[3].data.totalSteps).toBe(2);
  });

  it('should handle command handlers that return single events (backward compatibility)', async () => {
    await server.start();

    // Register a command handler that returns single event
    server.registerCommandHandlers([
      {
        name: 'SingleEventCommand',
        handle: async (command: Command) => {
          return {
            type: 'TaskCompleted',
            data: { result: 'success' },
            correlationId: command.correlationId,
            requestId: command.requestId,
            timestamp: new Date(),
          };
        },
      },
    ]);

    // Set up event capture
    server.subscribeToAllEvents((event: Event) => {
      capturedEvents.push(event);
    });

    // Send command via HTTP
    const response = await fetch(`http://localhost:${port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SingleEventCommand',
        data: { testData: 'single' },
        correlationId: 'single-corr',
        requestId: 'single-req',
      }),
    });

    expect(response.status).toBe(200);

    // Wait for events to be processed
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify single event was published
    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0].type).toBe('TaskCompleted');
    expect(capturedEvents[0].correlationId).toBe('single-corr');
    expect(capturedEvents[0].requestId).toBe('single-req');
  });

  it('should handle mixed command handlers (some single, some multiple events)', async () => {
    await server.start();

    // Register both types of command handlers
    server.registerCommandHandlers([
      {
        name: 'SingleEventHandler',
        handle: async (command: Command) => {
          return {
            type: 'SingleResult',
            data: { value: 'single' },
            correlationId: command.correlationId,
            requestId: command.requestId,
            timestamp: new Date(),
          };
        },
      },
      {
        name: 'MultiEventHandler',
        handle: async (command: Command) => {
          return [
            {
              type: 'MultiResult1',
              data: { value: 'first' },
              correlationId: command.correlationId,
              requestId: command.requestId,
              timestamp: new Date(),
            },
            {
              type: 'MultiResult2',
              data: { value: 'second' },
              correlationId: command.correlationId,
              requestId: command.requestId,
              timestamp: new Date(),
            },
          ];
        },
      },
    ]);

    // Set up event capture
    server.subscribeToAllEvents((event: Event) => {
      capturedEvents.push(event);
    });

    // Send single event command
    await fetch(`http://localhost:${port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SingleEventHandler',
        data: {},
        correlationId: 'mixed-1',
        requestId: 'req-1',
      }),
    });

    // Send multi event command
    await fetch(`http://localhost:${port}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'MultiEventHandler',
        data: {},
        correlationId: 'mixed-2',
        requestId: 'req-2',
      }),
    });

    // Wait for all events to be processed
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Should have 3 total events (1 + 2)
    expect(capturedEvents).toHaveLength(3);

    // Verify the single event
    const singleEvent = capturedEvents.find((e) => e.correlationId === 'mixed-1');
    expect(singleEvent?.type).toBe('SingleResult');

    // Verify the multiple events
    const multiEvents = capturedEvents.filter((e) => e.correlationId === 'mixed-2');
    expect(multiEvents).toHaveLength(2);
    expect(multiEvents[0].type).toBe('MultiResult1');
    expect(multiEvents[1].type).toBe('MultiResult2');
  });
});
