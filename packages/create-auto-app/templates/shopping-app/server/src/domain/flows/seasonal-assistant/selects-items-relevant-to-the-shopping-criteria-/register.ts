import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import type { SuggestShoppingItems } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
  messageBus.handle((command: SuggestShoppingItems) => handle(eventStore, command), 'SuggestShoppingItems');
}
