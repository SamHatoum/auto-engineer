import 'reflect-metadata';
import { CommandSender, EventStore, type InMemoryDatabase } from '@event-driven-io/emmett';

export interface ReactorContext {
  eventStore: EventStore;
  commandSender: CommandSender;
  database: InMemoryDatabase;
  [key: string]: unknown;
}

export interface GraphQLContext {
  eventStore: EventStore;
  messageBus: CommandSender;
  database: InMemoryDatabase;
}
