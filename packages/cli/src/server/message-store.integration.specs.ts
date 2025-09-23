import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageBusServer } from './server';
import { MemoryMessageStore, type SessionInfo, type MessageStoreStats } from '@auto-engineer/message-store';
import fetch from 'node-fetch';
import type { Command, Event } from '@auto-engineer/message-bus';
import getPort from 'get-port';

interface CommandResponse {
  status: string;
  commandId: string;
  timestamp?: string;
}

interface HttpPositionalMessage {
  streamId: string;
  message: Command | Event;
  messageType: 'command' | 'event';
  revision: string;
  position: string;
  timestamp: string;
  sessionId: string;
}

describe('Message Store Integration', async () => {
  let server: MessageBusServer;
  let messageStore: MemoryMessageStore;
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    port = await getPort();
    baseUrl = `http://localhost:${port}`;
    messageStore = new MemoryMessageStore();
    server = new MessageBusServer({
      port,
      messageStore,
      enableFileSync: false,
    });

    try {
      await server.start();
      server.registerCommandHandlers([
        {
          name: 'test-command',
          handle: async (command: Command) => {
            return {
              type: 'test-event',
              data: {
                commandId: command.requestId,
                processedAt: new Date().toISOString(),
                originalData: command.data,
              },
              correlationId: command.correlationId,
              requestId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            } as Event;
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await server?.stop();
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  });

  it('should store commands and events in message store and serve via HTTP endpoints', async () => {
    const command: Command = {
      type: 'test-command',
      data: { message: 'Hello World', userId: 'test-user' },
      requestId: 'test-req-123',
    };

    const commandResponse = await fetch(`${baseUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });

    if (!commandResponse.ok) {
      const errorText = await commandResponse.text();
      console.error('Command response error:', errorText);
      throw new Error(`Command failed with status ${commandResponse.status}: ${errorText}`);
    }

    expect(commandResponse.ok).toBe(true);
    const commandResult = (await commandResponse.json()) as CommandResponse;
    expect(commandResult.status).toBe('ack');
    expect(commandResult.commandId).toBe('test-req-123');

    const messagesResponse = await fetch(`${baseUrl}/messages`);

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('Messages response error:', errorText);
      throw new Error(`Messages failed with status ${messagesResponse.status}: ${errorText}`);
    }

    expect(messagesResponse.ok).toBe(true);

    const messages = (await messagesResponse.json()) as HttpPositionalMessage[];
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(2);

    const storedCommand = messages.find(
      (m: HttpPositionalMessage) =>
        m.messageType === 'command' && m.message.type === 'test-command' && m.message.requestId === 'test-req-123',
    );
    expect(storedCommand).toBeDefined();
    expect(storedCommand!.message.data.message).toBe('Hello World');
    expect(storedCommand!.message.data.userId).toBe('test-user');
    expect(storedCommand!.message.correlationId).toBeDefined();

    const storedEvent = messages.find(
      (m: HttpPositionalMessage) => m.messageType === 'event' && m.message.type === 'test-event',
    );
    expect(storedEvent).toBeDefined();
    expect(storedEvent!.message.data.commandId).toBe('test-req-123');
    expect((storedEvent!.message.data as { originalData: { message: string } }).originalData.message).toBe(
      'Hello World',
    );
    expect(storedEvent!.message.correlationId).toBeDefined();

    expect(storedEvent!.message.correlationId).toBe(storedCommand!.message.correlationId);

    const commandsResponse = await fetch(`${baseUrl}/commands`);
    expect(commandsResponse.ok).toBe(true);
    const commands = (await commandsResponse.json()) as HttpPositionalMessage[];
    const commandMessages = commands.filter((m: HttpPositionalMessage) => m.messageType === 'command');
    expect(commandMessages.length).toBeGreaterThan(0);
    expect(commands.every((m: HttpPositionalMessage) => m.messageType === 'command')).toBe(true);

    const eventsResponse = await fetch(`${baseUrl}/events`);
    expect(eventsResponse.ok).toBe(true);
    const events = (await eventsResponse.json()) as HttpPositionalMessage[];
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);

    const filteredResponse = await fetch(`${baseUrl}/messages?messageType=command`);
    expect(filteredResponse.ok).toBe(true);
    const filteredMessages = (await filteredResponse.json()) as HttpPositionalMessage[];
    expect(filteredMessages.every((m: HttpPositionalMessage) => m.messageType === 'command')).toBe(true);

    const jsonFilterResponse = await fetch(
      `${baseUrl}/messages?jsonFilter=${encodeURIComponent('{"userId":"test-user"}')}`,
    );
    expect(jsonFilterResponse.ok).toBe(true);
    const jsonFilteredMessages = (await jsonFilterResponse.json()) as HttpPositionalMessage[];
    expect(jsonFilteredMessages.length).toBeGreaterThan(0);
    expect(
      jsonFilteredMessages.some(
        (m: HttpPositionalMessage) =>
          m.message.data !== null &&
          m.message.data !== undefined &&
          'userId' in m.message.data &&
          m.message.data.userId === 'test-user',
      ),
    ).toBe(true);

    const sessionsResponse = await fetch(`${baseUrl}/sessions`);
    expect(sessionsResponse.ok).toBe(true);
    const sessions = (await sessionsResponse.json()) as SessionInfo[];
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);

    const currentSession = sessions[0];
    expect(currentSession.sessionId).toBeDefined();
    expect(currentSession.messageCount).toBeGreaterThan(0);
    expect(currentSession.commandCount).toBeGreaterThan(0);
    expect(currentSession.eventCount).toBeGreaterThan(0);

    const streamsResponse = await fetch(`${baseUrl}/streams`);
    expect(streamsResponse.ok).toBe(true);
    const streams = (await streamsResponse.json()) as string[];
    expect(Array.isArray(streams)).toBe(true);
    expect(streams).toContain('$all');
    expect(streams.some((stream) => stream.startsWith('session-'))).toBe(true); // session stream exists

    // Test the single $all stream contains both commands and events
    const allStreamResponse = await fetch(`${baseUrl}/streams/$all`);
    expect(allStreamResponse.ok).toBe(true);
    const allStreamMessages = (await allStreamResponse.json()) as HttpPositionalMessage[];
    expect(allStreamMessages.some((m: HttpPositionalMessage) => m.messageType === 'command')).toBe(true);
    expect(allStreamMessages.some((m: HttpPositionalMessage) => m.messageType === 'event')).toBe(true);

    const statsResponse = await fetch(`${baseUrl}/stats`);
    expect(statsResponse.ok).toBe(true);
    const stats = (await statsResponse.json()) as MessageStoreStats;
    expect(stats.totalMessages).toBeGreaterThan(0);
    expect(stats.totalCommands).toBeGreaterThan(0);
    expect(stats.totalEvents).toBeGreaterThan(0);
    expect(stats.totalStreams).toBeGreaterThan(0);
    expect(stats.totalSessions).toBe(1);
  });

  it('should handle multiple commands with proper correlation ID tracking', async () => {
    const command1: Command = {
      type: 'test-command',
      data: { step: 1 },
      requestId: 'req-1',
      correlationId: 'correlation-123',
    };

    const response1 = await fetch(`${baseUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command1),
    });

    if (!response1.ok) {
      const errorText = await response1.text();
      console.error('First command failed:', errorText);
      throw new Error(`First command failed with status ${response1.status}: ${errorText}`);
    }

    const command2: Command = {
      type: 'test-command',
      data: { step: 2 },
      requestId: 'req-2',
      correlationId: 'correlation-123',
    };

    await fetch(`${baseUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command2),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const correlatedResponse = await fetch(`${baseUrl}/messages?correlationId=correlation-123`);
    expect(correlatedResponse.ok).toBe(true);
    const correlatedMessages = (await correlatedResponse.json()) as HttpPositionalMessage[];

    expect(correlatedMessages.length).toBeGreaterThanOrEqual(4);
    expect(correlatedMessages.length).toBeLessThanOrEqual(16);
    expect(correlatedMessages.every((m: HttpPositionalMessage) => m.message.correlationId === 'correlation-123')).toBe(
      true,
    );

    const commands = correlatedMessages.filter((m: HttpPositionalMessage) => m.messageType === 'command');
    const events = correlatedMessages.filter((m: HttpPositionalMessage) => m.messageType === 'event');
    expect(commands.length).toBeGreaterThanOrEqual(2);
    expect(events.length).toBeGreaterThanOrEqual(2);

    const uniqueCommands = new Set(commands.map((cmd) => cmd.message.requestId));
    const uniqueEvents = new Set(events.map((evt) => evt.message.requestId));
    expect(uniqueCommands.size).toBe(2);
    expect(uniqueEvents.size).toBe(2);
  });

  it('should generate correlation IDs when not provided', async () => {
    const command: Command = {
      type: 'test-command',
      data: { test: 'auto-correlation' },
    };

    await fetch(`${baseUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const messagesResponse = await fetch(`${baseUrl}/messages`);
    const messages = (await messagesResponse.json()) as HttpPositionalMessage[];

    const testCommand = messages.find(
      (m: HttpPositionalMessage) =>
        m.messageType === 'command' &&
        m.message.data !== null &&
        m.message.data !== undefined &&
        'test' in m.message.data &&
        m.message.data.test === 'auto-correlation',
    );

    expect(testCommand).toBeDefined();
    expect(testCommand!.message.correlationId).toBeDefined();
    expect(testCommand!.message.correlationId).toMatch(/^corr-/);
    expect(testCommand!.message.requestId).toBeDefined();
    expect(testCommand!.message.requestId).toMatch(/^req-/);
  });

  it('should process and emit commands and events in interleaved order', async () => {
    const commands: Command[] = [
      {
        type: 'test-command',
        data: { commandIndex: 1 },
        requestId: 'cmd-1',
        correlationId: 'interleaved-test',
      },
      {
        type: 'test-command',
        data: { commandIndex: 2 },
        requestId: 'cmd-2',
        correlationId: 'interleaved-test',
      },
      {
        type: 'test-command',
        data: { commandIndex: 3 },
        requestId: 'cmd-3',
        correlationId: 'interleaved-test',
      },
      {
        type: 'test-command',
        data: { commandIndex: 4 },
        requestId: 'cmd-4',
        correlationId: 'interleaved-test',
      },
      {
        type: 'test-command',
        data: { commandIndex: 5 },
        requestId: 'cmd-5',
        correlationId: 'interleaved-test',
      },
    ];

    for (const command of commands) {
      const response = await fetch(`${baseUrl}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Command failed with status ${response.status}: ${errorText}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    const messagesResponse = await fetch(`${baseUrl}/messages`);
    expect(messagesResponse.ok).toBe(true);
    const messages = (await messagesResponse.json()) as HttpPositionalMessage[];

    // In the new architecture, all messages are in the $all stream, so we filter by sessionId
    const sessionMessages = messages.filter((m: HttpPositionalMessage) => m.streamId === '$all');

    sessionMessages.sort((a, b) => parseInt(a.position) - parseInt(b.position));

    const uniqueMessages = sessionMessages.filter((msg, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      return !(msg.messageType === prev.messageType && msg.message.requestId === prev.message.requestId);
    });

    expect(uniqueMessages.length).toBe(10);

    const expectedOrder = [
      { type: 'command', requestId: 'cmd-1' },
      { type: 'event', commandId: 'cmd-1' },
      { type: 'command', requestId: 'cmd-2' },
      { type: 'event', commandId: 'cmd-2' },
      { type: 'command', requestId: 'cmd-3' },
      { type: 'event', commandId: 'cmd-3' },
      { type: 'command', requestId: 'cmd-4' },
      { type: 'event', commandId: 'cmd-4' },
      { type: 'command', requestId: 'cmd-5' },
      { type: 'event', commandId: 'cmd-5' },
    ];

    for (let i = 0; i < expectedOrder.length; i++) {
      const expected = expectedOrder[i];
      const actual = uniqueMessages[i];

      if (expected.type === 'command') {
        expect(actual.messageType).toBe('command');
        expect(actual.message.requestId).toBe(expected.requestId);
      } else {
        expect(actual.messageType).toBe('event');
        expect(actual.message.data.commandId).toBe(expected.commandId);
      }
    }
  });
});
