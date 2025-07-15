import {
  inMemorySingleStreamProjection,
  type ReadEvent,
  type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import type { ListingCreated } from '../../host-manages-listings/create-listing';
import type { ListingRemoved } from '../../host-manages-listings/remove-listing/events';
import { AvailablePlace } from './state';

type ListingEvent = ListingCreated | ListingRemoved;

export const projection = inMemorySingleStreamProjection<AvailablePlace, ListingEvent>({
  collectionName: 'availableProperties',
  canHandle: ['ListingCreated', 'ListingRemoved'],
  getDocumentId: (event) => event.data.listingId,
  evolve: (
    document: AvailablePlace | null,
    event: ReadEvent<ListingEvent, InMemoryReadEventMetadata>,
  ): AvailablePlace | null => {
    switch (event.type) {
      case 'ListingCreated': {
        return {
          placeId: event.data.listingId,
          title: event.data.title,
          location: event.data.location,
          pricePerNight: event.data.pricePerNight,
          maxGuests: event.data.maxGuests,
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

export default projection;
