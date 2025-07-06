import { CommandHandler, type EventStore } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialListingState } from './state';
import { decide } from './decide';
import type { CreateListing } from './commands';
import type { HandlerResult } from '../../../shared';

const commandHandler = CommandHandler({
    evolve,
    initialState: initialListingState,
});

export const handle = async (
    eventStore: EventStore,
    command: CreateListing
): Promise<HandlerResult> => {
    const streamId = `property-${command.data.propertyId}`;
    try {
        await commandHandler(eventStore, streamId, (state) =>
            decide(command, state),
        );
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: {
                type: error?.name ?? 'UnknownError',
                message: error?.message ?? 'An unexpected error occurred',
            },
        };
    }
};