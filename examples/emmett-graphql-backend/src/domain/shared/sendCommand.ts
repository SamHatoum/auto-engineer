import type {Command, CommandSender} from '@event-driven-io/emmett';
import type { MutationResponse } from './types';

export async function sendCommand<T extends Command>(
    commandSender: CommandSender,
    command: T
): Promise<MutationResponse> {
    try {
        await commandSender.send(command);
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
}