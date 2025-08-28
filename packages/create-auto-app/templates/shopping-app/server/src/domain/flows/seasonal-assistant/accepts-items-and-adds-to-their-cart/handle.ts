import { CommandHandler, type EventStore, type MessageHandlerResult } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialState } from './state';
import { decide } from './decide';
import type { AddItemsToCart } from './commands';

const handler = CommandHandler({
  evolve,
  initialState,
});

export const handle = async (eventStore: EventStore, command: AddItemsToCart): Promise<MessageHandlerResult> => {
  const streamId = `shopping-session-${command.data.sessionId}`;

  try {
    await handler(eventStore, streamId, (state) => decide(command, state));
    return; // success (returns void)
  } catch (error: any) {
    return {
      type: 'SKIP',
      reason: `Command failed: ${error?.message ?? 'Unknown'}`,
    };
  }
};
