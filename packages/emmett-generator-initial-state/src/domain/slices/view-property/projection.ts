import type { PropertyListed } from '../list-property/events';
import type { PropertyRemoved } from '../remove-property/events';
import type { ViewProperty } from './views';
import {
    inMemorySingleStreamProjection,
    type ReadEvent,
    type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';

type PropertyEvent = PropertyListed | PropertyRemoved;

export const viewPropertyProjection = inMemorySingleStreamProjection<
    ViewProperty,
    PropertyEvent
>({
    collectionName: 'viewProperties',
    canHandle: ['PropertyListed', 'PropertyRemoved'],
    getDocumentId: (event) => event.data.propertyId,
    evolve: (
        document: ViewProperty | null,
        event: ReadEvent<PropertyEvent, InMemoryReadEventMetadata>
    ): ViewProperty | null => {
        switch (event.type) {
            case 'PropertyListed': {
                return {
                    propertyId: event.data.propertyId,
                    title: event.data.title,
                    location: event.data.location,
                    address: event.data.address,
                    description: event.data.description,
                    amenities: event.data.amenities,
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