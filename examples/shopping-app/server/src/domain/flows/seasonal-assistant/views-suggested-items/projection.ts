import {
  inMemorySingleStreamProjection,
  type ReadEvent,
  type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import type { SuggestedItems } from './state';
import type { ShoppingItemsSuggested } from '../selects-items-relevant-to-the-shopping-criteria-/events';

type AllEvents = ShoppingItemsSuggested;

export const projection = inMemorySingleStreamProjection<SuggestedItems, AllEvents>({
  collectionName: 'SuggestedItemsProjection',
  canHandle: ['ShoppingItemsSuggested'],
  getDocumentId: (event) => event.data.sessionId,
  evolve: (
    document: SuggestedItems | null,
    event: ReadEvent<AllEvents, InMemoryReadEventMetadata>,
  ): SuggestedItems | null => {
    switch (event.type) {
      case 'ShoppingItemsSuggested': {
        /**
         * ## IMPLEMENTATION INSTRUCTIONS ##
         * This event adds or updates the document.
         * Implement the correct fields as needed for your read model.
         */
        return {
          sessionId: /* TODO: map from event.data */ '',
          items: /* TODO: map from event.data */ [],
        };
      }
      default:
        return document;
    }
  },
});

export default projection;
