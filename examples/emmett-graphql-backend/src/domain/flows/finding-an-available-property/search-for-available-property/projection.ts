import {
    inMemorySingleStreamProjection,
    type ReadEvent,
    type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import type { ListingCreated } from '../../host-manages-listings/create-listing';
import type { PropertyRemoved } from '../../host-manages-listings/remove-property/events';
import {AvailableProperty} from "./state";

type PropertyEvent = ListingCreated | PropertyRemoved;

export const projection = inMemorySingleStreamProjection<
    AvailableProperty,
    PropertyEvent
>({
    collectionName: 'availableProperties',
    canHandle: ['ListingCreated', 'PropertyRemoved'],
    getDocumentId: (event) => event.data.propertyId,
    evolve: (
        document: AvailableProperty | null,
        event: ReadEvent<PropertyEvent, InMemoryReadEventMetadata>
    ): AvailableProperty | null => {
        switch (event.type) {
            case 'ListingCreated': {
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