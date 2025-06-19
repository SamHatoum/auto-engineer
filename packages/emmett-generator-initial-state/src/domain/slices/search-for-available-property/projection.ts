import {
    inMemorySingleStreamProjection,
    type ReadEvent,
    type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import type { AvailableProperty } from './views';
import type { PropertyListed } from '../list-property/events';
import type { PropertyRemoved } from '../remove-property/events';

type PropertyEvent = PropertyListed | PropertyRemoved;

export const projection = inMemorySingleStreamProjection<
    AvailableProperty,
    PropertyEvent
>({
    collectionName: 'availableProperties',
    canHandle: ['PropertyListed', 'PropertyRemoved'],
    getDocumentId: (event) => event.data.propertyId,
    evolve: (
        document: AvailableProperty | null,
        event: ReadEvent<PropertyEvent, InMemoryReadEventMetadata>
    ): AvailableProperty | null => {
        switch (event.type) {
            case 'PropertyListed': {
                return {
                    propertyId: event.data.propertyId,
                    title: event.data.title,
                    location: event.data.location,
                    pricePerNight: event.data.pricePerNight,
                    maxGuests: event.data.maxGuests,
                };
            }
            case 'PropertyRemoved': {
                return null;
            }
            default:
                return document;
        }
    },
});

export default projection;