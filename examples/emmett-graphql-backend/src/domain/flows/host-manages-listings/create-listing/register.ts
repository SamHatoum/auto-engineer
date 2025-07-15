import type { CommandProcessor, EventStore } from '@event-driven-io/emmett';
import { handle } from './handle';
import { CreateListing } from './commands';

export function register(messageBus: CommandProcessor, eventStore: EventStore) {
  messageBus.handle((command: CreateListing) => handle(eventStore, command), 'CreateListing');
}
