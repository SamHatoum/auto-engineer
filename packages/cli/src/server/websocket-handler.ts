import { Server as SocketIOServer } from 'socket.io';
import type { MessageBus, Command } from '@auto-engineer/message-bus';
import type { StateManager } from './state-manager';
import createDebug from 'debug';

const debugWs = createDebug('auto-engineer:server:ws');

export function setupWebSocketHandlers(
  io: SocketIOServer,
  messageBus: MessageBus,
  stateManager: StateManager<Record<string, unknown>>,
): void {
  io.on('connection', (socket) => {
    debugWs('WebSocket client connected:', socket.id);

    // Send current state to new client
    socket.emit('state', stateManager.getState());

    // Handle command from WebSocket
    socket.on('command', async (command: Command) => {
      debugWs('Received command via WebSocket:', command.type);

      try {
        // Add request ID if not present
        const hasRequestId = command.requestId !== null && command.requestId !== undefined && command.requestId !== '';
        const cmdWithId = hasRequestId
          ? command
          : { ...command, requestId: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` };

        await messageBus.sendCommand(cmdWithId);

        socket.emit('command-ack', {
          status: 'ack',
          commandId: cmdWithId.requestId,
        });
      } catch (error) {
        socket.emit('command-ack', {
          status: 'nack',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle state query
    socket.on('get-state', () => {
      socket.emit('state', stateManager.getState());
    });

    socket.on('disconnect', () => {
      debugWs('WebSocket client disconnected:', socket.id);
    });
  });

  debugWs('WebSocket handlers configured');
}
