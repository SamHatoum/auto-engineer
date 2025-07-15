import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialListingState, ListingState } from './state';
import { describe, it } from 'vitest';
import { RemoveListing } from './commands';
import { ListingCreated } from '../create-listing';
import { ListingRemoved } from './events';

describe('Listing | RemoveListing', () => {
  const now = new Date();
  const given = DeciderSpecification.for<RemoveListing, ListingCreated | ListingRemoved, ListingState>({
    decide,
    evolve,
    initialState: initialListingState,
  });

  it('should emit ListingRemoved when listing is listed', () => {
    given([
      {
        type: 'ListingCreated',
        data: {
          listingId: 'property-123',
          hostId: 'host-abc',
          location: 'San Francisco',
          address: '123 Market St',
          title: 'Modern Apartment',
          description: 'Great place in the city',
          pricePerNight: 250,
          maxGuests: 4,
          amenities: ['wifi', 'kitchen'],
          listedAt: now,
        },
      },
    ])
      .when({
        type: 'RemoveListing',
        data: {
          listingId: 'property-123',
          hostId: 'host-abc',
        },
        metadata: { now },
      })
      .then([
        {
          type: 'ListingRemoved',
          data: {
            listingId: 'property-123',
            hostId: 'host-abc',
            removedAt: now,
          },
        },
      ]);
  });

  it('should throw if listing is not listed', () => {
    given([])
      .when({
        type: 'RemoveListing',
        data: {
          listingId: 'property-123',
          hostId: 'host-abc',
        },
        metadata: { now },
      })
      .thenThrows((error: Error) => error.message === 'Cannot remove a listing that is not listed');
  });
});
