import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageBusServer } from './server';
import { on, dispatch, fold, getRegistrations } from '../dsl';
import type { Command, Event } from '@auto-engineer/message-bus';

describe('Message Bus Server Integration', () => {
  let server: MessageBusServer;

  beforeEach(() => {
    server = new MessageBusServer({
      port: 5555, // Use different port for tests
      enableFileSync: false, // Disable file sync for tests
    });
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should start and stop the server', async () => {
    await server.start();

    // Check health endpoint
    const response = await fetch('http://localhost:5555/health');
    expect(response.status).toBe(200);

    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.uptime).toBeGreaterThan(0);
  });

  it('should handle commands via HTTP POST', async () => {
    await server.start();

    // Register a command handler first
    server.registerCommandHandlers([
      {
        name: 'TestCommand',
        handle: async (command: Command) => {
          return {
            type: 'TestResult',
            data: { success: true },
          };
        },
      },
    ]);

    const command: Command = {
      type: 'TestCommand',
      data: { test: 'value' },
    };

    const response = await fetch('http://localhost:5555/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.status).toBe('ack');
    expect(result.commandId).toBeDefined();
  });

  it('should register and execute event handlers', async () => {
    let handlerExecuted = false;

    // Register event handler
    server.registerEventHandler({
      type: 'on',
      eventType: 'TestEvent',
      handler: (event: Event) => {
        handlerExecuted = true;
        return {
          type: 'ResultCommand',
          data: { result: event.data },
        };
      },
    });

    await server.start();

    // Publish an event directly to the message bus
    const bus = server.getMessageBus();
    await bus.publishEvent({
      type: 'TestEvent',
      data: { test: 'data' },
    });

    // Give it a moment to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handlerExecuted).toBe(true);
  });

  it('should apply fold functions to update state', async () => {
    // Initialize state
    server.initializeState({ count: 0 });

    // Register fold function
    server.registerFold({
      type: 'fold',
      eventType: 'IncrementEvent',
      reducer: (state: any, event: Event) => ({
        ...state,
        count: state.count + (event.data.amount || 1),
      }),
    });

    await server.start();

    // Publish events
    const bus = server.getMessageBus();
    await bus.publishEvent({
      type: 'IncrementEvent',
      data: { amount: 5 },
    });

    await bus.publishEvent({
      type: 'IncrementEvent',
      data: { amount: 3 },
    });

    // Check state via HTTP
    const response = await fetch('http://localhost:5555/state');
    const state = await response.json();

    expect(state.count).toBe(8);
  });

  it('should handle DSL configuration', async () => {
    // Simulate DSL execution
    on('OrderCreated', (event: Event) =>
      dispatch({
        type: 'SendEmailCommand',
        data: { orderId: event.data.orderId },
      }),
    );

    fold('OrderCreated', (state: any, event: Event) => ({
      ...state,
      orders: [...(state.orders || []), event.data],
    }));

    // Get registrations
    const registrations = getRegistrations();

    // Register them with the server
    for (const reg of registrations) {
      if (reg.type === 'on') {
        server.registerEventHandler(reg as any);
      } else if (reg.type === 'fold') {
        server.registerFold(reg as any);
      }
    }

    // Initialize state
    server.initializeState({ orders: [] });

    await server.start();

    // Publish an OrderCreated event
    const bus = server.getMessageBus();
    await bus.publishEvent({
      type: 'OrderCreated',
      data: { orderId: '123', total: 100 },
    });

    // Wait a bit for the event to be processed
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check state was updated
    const response = await fetch('http://localhost:5555/state');
    const state = await response.json();

    expect(state.orders).toHaveLength(1);
    expect(state.orders[0].orderId).toBe('123');
  });

  it('should validate command structure', async () => {
    await server.start();

    // Send invalid command (missing data)
    const response = await fetch('http://localhost:5555/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'TestCommand' }),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.status).toBe('nack');
    expect(result.error).toContain('Invalid command structure');
  });

  it('should handle parallel dispatch', async () => {
    const executedCommands: string[] = [];

    // Register command handlers
    server.registerCommandHandlers([
      {
        name: 'Command1',
        handle: async (cmd: Command) => {
          executedCommands.push(cmd.type);
          return { type: 'Command1Completed', data: {} };
        },
      },
      {
        name: 'Command2',
        handle: async (cmd: Command) => {
          executedCommands.push(cmd.type);
          return { type: 'Command2Completed', data: {} };
        },
      },
    ]);

    // Register event handler with parallel dispatch
    server.registerEventHandler({
      type: 'on',
      eventType: 'TriggerParallel',
      handler: () =>
        dispatch.parallel([
          { type: 'Command1', data: {} },
          { type: 'Command2', data: {} },
        ]),
    });

    await server.start();

    // Trigger the event
    const bus = server.getMessageBus();
    await bus.publishEvent({
      type: 'TriggerParallel',
      data: {},
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(executedCommands).toContain('Command1');
    expect(executedCommands).toContain('Command2');
  });
});
