import type { Command, CommandSender } from '@event-driven-io/emmett';
import type { MutationResponse } from './graphql-types';

export async function sendCommand<T extends Command>(
  commandSender: CommandSender,
  command: T,
): Promise<MutationResponse> {
  try {
    await commandSender.send(command);
    return { success: true };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    return {
      success: false,
      error: {
        type: err?.name ?? 'UnknownError',
        message: err?.message ?? 'An unexpected error occurred',
      },
    };
  }
}
