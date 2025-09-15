import { CommandHandler, type EventStore, type MessageHandlerResult } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialState } from './state';
import { decide } from './decide';
import type { AnswerQuestion } from './commands';

const handler = CommandHandler({
  evolve,
  initialState,
});

export const handle = async (eventStore: EventStore, command: AnswerQuestion): Promise<MessageHandlerResult> => {
  const streamId = 'questionnaire-participantId';

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
