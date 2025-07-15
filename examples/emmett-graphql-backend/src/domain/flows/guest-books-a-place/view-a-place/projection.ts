import type { ListingRemoved } from '../../host-manages-listings/remove-listing/events';
import {
  inMemorySingleStreamProjection,
  type ReadEvent,
  type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import { ListingCreated } from '../../host-manages-listings/create-listing';
import { ViewPlace } from './state';

type ListingEvent = ListingCreated | ListingRemoved;

export const projection = inMemorySingleStreamProjection<ViewPlace, ListingEvent>({
  collectionName: 'viewProperties',
  canHandle: ['ListingCreated', 'ListingRemoved'],
  getDocumentId: (event) => event.data.listingId,
  evolve: (document: ViewPlace | null, event: ReadEvent<ListingEvent, InMemoryReadEventMetadata>): ViewPlace | null => {
    switch (event.type) {
      case 'ListingCreated': {
        return {
          placeId: event.data.listingId,
          title: event.data.title,
          location: event.data.location,
          address: event.data.address,
          description: event.data.description,
          amenities: event.data.amenities,
        };
      }
      case 'ListingRemoved': {
        return null;
      }
      default:
        return document;
    }
  },
});
