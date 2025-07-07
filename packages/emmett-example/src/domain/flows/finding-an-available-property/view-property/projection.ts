import type { PropertyRemoved } from '../../host-manages-listings/remove-property';
import {
    inMemorySingleStreamProjection,
    type ReadEvent,
    type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import {ListingCreated} from "../../host-manages-listings/create-listing";
import {ViewProperty} from "./readmodel";

type PropertyEvent = ListingCreated | PropertyRemoved;

export const projection = inMemorySingleStreamProjection<
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