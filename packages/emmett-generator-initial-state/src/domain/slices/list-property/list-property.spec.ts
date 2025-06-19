
import { DeciderSpecification } from '@event-driven-io/emmett';
import { listProperty } from './decide';
import { evolve } from './evolve';
import { initialPropertyState } from './state';
import {ListProperty} from "./commands";
import {PropertyListed} from "./events";
import { describe, it, expect } from 'vitest';

describe('Property | ListProperty', () => {
    const now = new Date();
    const command: ListProperty = {
        type: 'ListProperty',
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
        },
        metadata: {
            now,
        },
    };

    const expectedEvent: PropertyListed = {
        type: 'PropertyListed',
        data: {
            ...command.data,
            listedAt: now,
        },
    };

    const given = DeciderSpecification.for({
        decide: listProperty,
        evolve,
        initialState: initialPropertyState,
    });

    it('should emit PropertyListed when state is Empty', () => {
        given([])
            .when(command)
            .then([expectedEvent]);
    });

    it('should throw if property already exists', () => {
        given([
            expectedEvent,
        ])
            .when(command)
            .thenThrows((e) => e.message === 'Property already exists');
    });
});