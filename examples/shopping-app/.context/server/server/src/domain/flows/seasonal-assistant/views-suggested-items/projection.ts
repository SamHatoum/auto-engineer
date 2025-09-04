import {
  inMemorySingleStreamProjection,
  type ReadEvent,
  type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import type { SuggestedItems } from './state';
type AllEvents = never;

export const projection = inMemorySingleStreamProjection<SuggestedItems, AllEvents>({
  collectionName: 'SuggestedItemsProjection',
  canHandle: [],
  getDocumentId: (event) => event.data.sessionId,
  evolve: (
    document: SuggestedItems | null,
    event: ReadEvent<AllEvents, InMemoryReadEventMetadata>,
  ): SuggestedItems | null => {
    switch (event.type) {
      default:
        return document;
    }
  },
});

export default projection;
