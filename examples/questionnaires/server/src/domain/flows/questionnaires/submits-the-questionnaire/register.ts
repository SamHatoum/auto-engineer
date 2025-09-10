import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import type { SubmitQuestionnaire } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
  messageBus.handle((command: SubmitQuestionnaire) => handle(eventStore, command), 'SubmitQuestionnaire');
}
