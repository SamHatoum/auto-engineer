import { PropertyState } from './state';
import { PropertyListed } from './events';

export const evolve = (
    state: PropertyState,
    event: PropertyListed
): PropertyState => {
    switch (event.type) {
        case 'PropertyListed':
            return {
                status: 'Listed',
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