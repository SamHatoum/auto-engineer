import type { PropertyRemoved } from '../remove-property';
import type { ViewProperty } from './views';
import {
    inMemorySingleStreamProjection,
    type ReadEvent,
    type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import {ListingCreated} from "../create-listing";

type PropertyEvent = ListingCreated | PropertyRemoved;

export const viewPropertyProjection = inMemorySingleStreamProjection<
    ViewProperty,
    PropertyEvent
>({
    collectionName: 'viewProperties',
    canHandle: ['ListingCreated', 'PropertyRemoved'],
    getDocumentId: (event) => event.data.propertyId,
    evolve: (
        document: ViewProperty | null,
        event: ReadEvent<PropertyEvent, InMemoryReadEventMetadata>
    ): ViewProperty | null => {
        switch (event.type) {
            case 'ListingCreated': {
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