import { CommandHandler, type EventStore } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialPropertyState } from './state';
import { decide } from './decide';
import type { RemoveProperty } from './commands';

const commandHandler = CommandHandler({
    evolve,
    initialState: initialPropertyState,
});

export const handle = async (
    eventStore: EventStore,
    command: RemoveProperty
): Promise<void> => {
    const streamId = `property-${command.data.propertyId}`;
    await commandHandler(eventStore, streamId, (state) =>
        decide(command, state),
    );
};