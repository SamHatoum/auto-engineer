import type { EventStore, MessageHandlerResult } from '@event-driven-io/emmett';
import { CommandHandler } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { decide } from './decide';
import { initialState } from './state';
import type { CreateListing } from './commands';

const handler = CommandHandler({
    evolve,
    initialState,
});

export const handle = async (
    eventStore: EventStore,
    command: CreateListing
): Promise<MessageHandlerResult> => {
    try {
        await handler(eventStore, `property-${command.data.propertyId}`, (state) =>
            decide(command, state)
        );
        return;
    } catch (error: any) {
        return {
            type: 'SKIP',
            reason: `Command failed: ${error?.message ?? 'Unknown'}`,
        };
    }
};