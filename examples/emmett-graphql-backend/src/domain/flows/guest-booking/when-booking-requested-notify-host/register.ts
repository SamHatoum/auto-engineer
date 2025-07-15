import type { CommandSender, InMemoryEventStore } from '@event-driven-io/emmett';
import { react } from './react';

export async function register(messageBus: CommandSender, eventStore: InMemoryEventStore) {
  await react().start({ eventStore, commandSender: messageBus });
}
