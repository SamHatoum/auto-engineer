import type { InMemoryEventStore } from '@event-driven-io/emmett';

export interface GraphQLContext {
    eventStore: InMemoryEventStore;
}