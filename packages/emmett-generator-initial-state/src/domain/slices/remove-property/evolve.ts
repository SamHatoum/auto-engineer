import type { PropertyState } from './state';
import type { PropertyRemoved } from './events';

export const evolve = (
    state: PropertyState,
    event: PropertyRemoved
): PropertyState => {
    switch (event.type) {
        case 'PropertyRemoved':
            return {
                status: 'Removed',
                propertyId: event.data.propertyId,
            };
        default:
            return state;
    }
};