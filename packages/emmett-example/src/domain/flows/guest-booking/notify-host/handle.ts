import type { EventStore } from '@event-driven-io/emmett';
import type { HandlerResult } from '../../../shared';
import { CommandHandler } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { decide } from './decide';
import { initialState } from './state';
import {NotifyHost} from "./commands";

const commandHandler = CommandHandler({
    evolve,
    initialState,
});

export const handle = async (
    eventStore: EventStore,
    command: NotifyHost
): Promise<HandlerResult> => {
    const streamId = `notify-host-${command.data.hostId}`;

    try {
        await commandHandler(eventStore, streamId, (state) => decide(command, state));
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