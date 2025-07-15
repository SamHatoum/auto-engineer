import { DeciderSpecification } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialState } from './state';
import { describe, it } from 'vitest';
import { decide } from './decide';

describe('Listing | CreateListing', () => {
  const now = new Date();
  const given = DeciderSpecification.for({
    decide: decide,
    evolve,
    initialState: initialState,
  });

  it('should emit ListingCreated when state is Empty', () => {
    given([])
      .when({
        type: 'CreateListing',
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
        },
        metadata: {
          now,
        },
      })
      .then([
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
      ]);
  });

  it('should throw if listing already exists', () => {
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
        type: 'CreateListing',
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
        },
        metadata: {
          now,
        },
      })
      .thenThrows((e) => e.message === 'Listing already exists');
  });
});
