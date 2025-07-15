import { describe, it, beforeEach, expect } from 'vitest';
import { v4 as uuid } from 'uuid';
import { InMemoryProjectionSpec, eventsInStream, newEventsInStream } from '@event-driven-io/emmett';
import { projection } from './projection';

import type { ListingCreated } from '../../host-manages-listings/create-listing';
import type { ListingRemoved } from '../../host-manages-listings/remove-listing/events';
import { AvailablePlace } from './state';

type ListingEvent = ListingCreated | ListingRemoved;

describe('Available Place Projection', () => {
  let given: InMemoryProjectionSpec<ListingEvent>;
  let listingId: string;

  beforeEach(() => {
    listingId = `property-${uuid()}`;
    given = InMemoryProjectionSpec.for({
      projection: projection,
    });
  });

  it('creates availablePlace document', () =>
    given([])
      .when([
        {
          type: 'ListingCreated',
          data: {
            listingId,
            hostId: `host-${uuid()}`,
            location: 'London',
            address: '123 blah blah',
            title: 'Beautiful House',
            description: 'Some description',
            pricePerNight: 250,
            maxGuests: 6,
            amenities: ['WiFi', 'Pool'],
            listedAt: new Date(),
          },
          metadata: {
            streamName: listingId,
            streamPosition: 1n,
            globalPosition: 1n,
          },
        },
      ])
      .then(async (state) => {
        const document = await state.database
          .collection<AvailablePlace>('availableProperties')
          .findOne((doc) => doc.placeId === listingId);

        const expected: AvailablePlace = {
          placeId: listingId,
          title: 'Beautiful House',
          location: 'London',
          pricePerNight: 250,
          maxGuests: 6,
        };

        expect(document).toMatchObject(expected);
      }));

  it('removes place document when ListingRemoved event is processed', () =>
    given(
      eventsInStream(listingId, [
        {
          type: 'ListingCreated',
          data: {
            listingId,
            hostId: `host-${uuid()}`,
            location: 'London',
            address: '123 blah blah',
            title: 'Beautiful House',
            description: 'Some description',
            pricePerNight: 300,
            maxGuests: 6,
            amenities: ['WiFi', 'Pool'],
            listedAt: new Date(),
          },
        },
      ]),
    )
      .when(
        newEventsInStream(listingId, [
          {
            type: 'ListingRemoved',
            data: {
              listingId,
              hostId: `host-${uuid()}`,
              removedAt: new Date(),
            },
          },
        ]),
      )
      .then(async (state) => {
        const document = await state.database
          .collection<AvailablePlace>('availableProperties')
          .findOne((doc) => doc.placeId === listingId);
        expect(document).toBeNull();
      }));
});
