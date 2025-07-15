import { ListingState } from './state';
import { ListingCreated } from './events';

export const evolve = (state: ListingState, event: ListingCreated): ListingState => {
  switch (event.type) {
    case 'ListingCreated':
      return {
        status: 'Created',
        propertyId: event.data.propertyId,
        hostId: event.data.hostId,
        location: event.data.location,
        address: event.data.address,
        title: event.data.title,
        description: event.data.description,
        pricePerNight: event.data.pricePerNight,
        maxGuests: event.data.maxGuests,
        amenities: event.data.amenities,
      };
    default:
      return state;
  }
};
