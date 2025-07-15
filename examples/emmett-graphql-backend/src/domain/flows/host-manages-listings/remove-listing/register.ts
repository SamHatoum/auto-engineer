import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import { RemoveListing } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
  messageBus.handle((command: RemoveListing) => handle(eventStore, command), 'RemoveListing');
}
