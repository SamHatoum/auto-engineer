import { CommandHandler, type EventStore, type MessageHandlerResult } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialPropertyState } from './state';
import { decide } from './decide';
import type { RemoveProperty } from './commands';

const handler = CommandHandler({
    evolve,
    initialState: initialPropertyState,
});

export const handle = async (
    eventStore: EventStore,
    command: RemoveProperty
): Promise<MessageHandlerResult> => {
    const streamId = `property-${command.data.propertyId}`;
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