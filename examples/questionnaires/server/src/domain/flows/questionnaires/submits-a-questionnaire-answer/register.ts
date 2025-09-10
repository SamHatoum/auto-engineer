import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import type { AnswerQuestion } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
  messageBus.handle((command: AnswerQuestion) => handle(eventStore, command), 'AnswerQuestion');
}
