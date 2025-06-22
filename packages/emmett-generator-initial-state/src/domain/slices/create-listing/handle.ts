import { CommandHandler, type EventStore } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialListingState } from './state';
import { decide } from "./decide";
import type { CreateListing } from "./commands";

const commandHandler = CommandHandler({
    evolve,
    initialState: initialListingState,
});

export const handle = async (
    eventStore: EventStore,
    command: CreateListing
): Promise<void> => {
    const streamId = `property-${command.data.propertyId}`;
    await commandHandler(eventStore, streamId, (state) =>
        decide(command, state),
    );
};