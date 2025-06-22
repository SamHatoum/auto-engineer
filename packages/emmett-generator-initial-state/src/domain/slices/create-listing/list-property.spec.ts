import {DeciderSpecification} from '@event-driven-io/emmett';
import {evolve} from './evolve';
import {initialPropertyState} from './state';
import {describe, it} from 'vitest';
import {decide} from "./decide";

describe('Property | ListProperty', () => {
    const now = new Date();
    const given = DeciderSpecification.for({
        decide: decide,
        evolve,
        initialState: initialPropertyState,
    });

    it('should emit PropertyListed when state is Empty', () => {
        given([])
            .when({
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
            })
            .then([{
                type: 'PropertyListed',
                data: {
                    ...{
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
                    }.data,
                    listedAt: now,
                },
            }]);
    });

    it('should throw if property already exists', () => {
        given([
            {
                type: 'PropertyListed',
                data: {
                    ...{
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
                    }.data,
                    listedAt: now,
                },
            },
        ])
            .when({
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
            })
            .thenThrows((e) => e.message === 'Property already exists');
    });
});