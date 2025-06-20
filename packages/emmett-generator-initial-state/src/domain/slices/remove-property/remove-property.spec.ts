import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialPropertyState } from './state';
import { RemoveProperty } from './commands';
import { PropertyRemoved } from './events';
import { describe, it, expect } from 'vitest';

describe('Property | RemoveProperty', () => {
    const now = new Date();

    const command: RemoveProperty = {
        type: 'RemoveProperty',
        data: {
            propertyId: 'property-123',
            hostId: 'host-abc',
        },
        metadata: { now },
    };

    const expectedEvent: PropertyRemoved = {
        type: 'PropertyRemoved',
        data: {
            propertyId: 'property-123',
            hostId: 'host-abc',
            removedAt: now,
        },
    };

    const given = DeciderSpecification.for({
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
            } as any,
        ])
            .when(command)
            .then([expectedEvent]);
    });

    it('should throw if property is not listed', () => {
        const initialState = initialPropertyState();

        expect(() => decide(command, initialState)).toThrow(
            'Cannot remove a property that is not listed'
        );
    });
});