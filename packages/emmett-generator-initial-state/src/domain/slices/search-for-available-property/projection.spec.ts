import { describe, it, beforeEach, expect } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
    InMemoryProjectionSpec,
    eventsInStream,
    newEventsInStream,
} from '@event-driven-io/emmett';
import { projection } from './projection';
import { AvailableProperty } from './views';

import type { PropertyListed } from '../list-property/events';
import type { PropertyRemoved } from '../remove-property/events';

type PropertyEvent = PropertyListed | PropertyRemoved;

describe('Available Property Projection', () => {
    let given: InMemoryProjectionSpec<PropertyEvent>;
    let propertyId: string;

    beforeEach(() => {
        propertyId = `property-${uuid()}`;
        given = InMemoryProjectionSpec.for({
            projection: projection,
        });
    });

    it('creates availableProperty document', () =>
        given([])
            .when([
                {
                    type: 'PropertyListed',
                    data: {
                        propertyId,
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
                        streamName: propertyId,
                        streamPosition: 1n,
                        globalPosition: 1n,
                    },
                },
            ])
            .then(async (state) => {
                const document = await state.database
                    .collection<AvailableProperty>('availableProperties')
                    .findOne((doc) => doc.propertyId === propertyId);

                const expected: AvailableProperty = {
                    propertyId,
                    title: 'Beautiful House',
                    location: 'London',
                    pricePerNight: 250,
                    maxGuests: 6,
                };

                expect(document).toMatchObject(expected);
            }));

    it('removes property document when PropertyRemoved event is processed', () =>
        given(
            eventsInStream(propertyId, [
                {
                    type: 'PropertyListed',
                    data: {
                        propertyId,
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
                newEventsInStream(propertyId, [
                    {
                        type: 'PropertyRemoved',
                        data: {
                            propertyId,
                            hostId: `host-${uuid()}`,
                            removedAt: new Date(),
                        },
                    },
                ]),
            )
            .then(async (state) => {
                const document = await state.database
                    .collection<AvailableProperty>('availableProperties')
                    .findOne(doc => doc.propertyId === propertyId);
                expect(document).toBeNull();
            }));
});