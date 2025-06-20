import type { PropertyState } from './state';
import type { PropertyRemoved } from './events';
import type { PropertyListed } from '../list-property/events';

export const evolve = (
    state: PropertyState,
    event: PropertyRemoved | PropertyListed
): PropertyState => {
    switch (event.type) {
        case 'PropertyListed':
            // This slice cares that a property became "Listed"
            // because it needs to know it can be removed
            return {
                status: 'Listed',
                propertyId: event.data.propertyId,
            };
        case 'PropertyRemoved':
            return {
                status: 'Removed',
                propertyId: event.data.propertyId,
            };
        default:
            return state;
    }
};