import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import type { AddItemsToCart } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
  messageBus.handle((command: AddItemsToCart) => handle(eventStore, command), 'AddItemsToCart');
}
