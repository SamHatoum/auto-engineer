import {DeciderSpecification} from '@event-driven-io/emmett';
import {decide} from './decide';
import {evolve} from './evolve';
import {initialPropertyState, PropertyState} from './state';
import {describe, expect, it} from 'vitest';
import {RemoveProperty} from "./commands";
import {PropertyListed} from "../list-property/events";
import {PropertyRemoved} from "./events";

describe('Property | RemoveProperty', () => {
    const now = new Date();
    const given = DeciderSpecification.for<RemoveProperty, PropertyListed | PropertyRemoved, PropertyState>({
        decide,
        evolve,
        initialState: initialPropertyState,
    });

    it('should emit PropertyRemoved when property is listed', () => {
        given([
            {
                type: 'PropertyListed',
                data: {
                    propertyId: 'property-123',
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
                type: 'RemoveProperty',
                data: {
                    propertyId: 'property-123',
                    hostId: 'host-abc',
                },
                metadata: {now},
            })
            .then([{
                type: 'PropertyRemoved',
                data: {
                    propertyId: 'property-123',
                    hostId: 'host-abc',
                    removedAt: now,
                },
            }]);
    });

    it('should throw if property is not listed', () => {
        const initialState = initialPropertyState();

        expect(() => decide({
            type: 'RemoveProperty',
            data: {
                propertyId: 'property-123',
                hostId: 'host-abc',
            },
            metadata: {now},
        }, initialState)).toThrow(
            'Cannot remove a property that is not listed'
        );
    });
});