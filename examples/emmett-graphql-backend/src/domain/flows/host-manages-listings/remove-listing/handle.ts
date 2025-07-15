import { CommandHandler, type EventStore, type MessageHandlerResult } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialListingState } from './state';
import { decide } from './decide';
import type { RemoveListing } from './commands';

const handler = CommandHandler({
  evolve,
  initialState: initialListingState,
});

export const handle = async (eventStore: EventStore, command: RemoveListing): Promise<MessageHandlerResult> => {
  const streamId = `listing-${command.data.listingId}`;
  try {
    await handler(eventStore, streamId, (state) => decide(command, state));
    return;
  } catch (error: any) {
    return {
      type: 'SKIP',
      reason: `Command failed: ${error?.message ?? 'Unknown error'}`,
    };
  }
};
