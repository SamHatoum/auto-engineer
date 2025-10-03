import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginLoader } from './plugin-loader';
import { MessageBusServer } from './server/server';
import getPort from 'get-port';

describe('PluginLoader --host functionality', () => {
  let server: MessageBusServer;
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    port = await getPort();
    baseUrl = `http://localhost:${port}`;
    server = new MessageBusServer({
      port,
      enableFileSync: false,
    });

    await server.start();

    server.registerCommandHandlers([
      {
        name: 'TestCommand',
        handle: async () => {
          return {
            type: 'TestEvent',
            data: { success: true },
          };
        },
      },
    ]);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should execute locally when no host is provided', async () => {
    const loader = new PluginLoader();

    loader.getMessageBus().registerCommandHandler({
      name: 'test-command',
      handle: async () => {
        return {
          type: 'test-event',
          data: { success: true },
        };
      },
    });

    const sendCommandSpy = vi.spyOn(loader.getMessageBus(), 'sendCommand');

    await loader.executeCommand('test-command', { foo: 'bar' });

    expect(sendCommandSpy).toHaveBeenCalledOnce();
    expect(sendCommandSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test-command',
        data: { foo: 'bar' },
      }),
    );
  });

  it('should send to remote server when host is provided', async () => {
    const loader = new PluginLoader(baseUrl);

    await loader.executeCommand('TestCommand', { foo: 'bar' });

    const messages = await fetch(`${baseUrl}/messages`).then((r) => r.json());
    expect(messages).toHaveLength(2);
    expect(messages[0].messageType).toBe('command');
    expect(messages[0].message.type).toBe('TestCommand');
    expect(messages[0].message.data).toEqual({ foo: 'bar' });
  });

  it('should send to remote server when host is set via setHost', async () => {
    const loader = new PluginLoader();
    loader.setHost(baseUrl);

    await loader.executeCommand('TestCommand', { foo: 'bar' });

    const messages = await fetch(`${baseUrl}/messages`).then((r) => r.json());
    expect(messages).toHaveLength(2);
    expect(messages[0].messageType).toBe('command');
    expect(messages[0].message.type).toBe('TestCommand');
  });

  it('should throw error when remote server is unavailable and host is provided', async () => {
    const loader = new PluginLoader('http://localhost:99999');

    await expect(loader.executeCommand('TestCommand', { foo: 'bar' })).rejects.toThrow(
      'Failed to send command to remote server',
    );
  });
});
