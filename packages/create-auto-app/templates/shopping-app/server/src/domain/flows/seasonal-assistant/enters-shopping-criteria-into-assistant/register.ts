import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import type { EnterShoppingCriteria } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
  messageBus.handle((command: EnterShoppingCriteria) => handle(eventStore, command), 'EnterShoppingCriteria');
}
