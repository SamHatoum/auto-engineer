import type { BookingState } from './state';
import type { BookingRequested } from './events';

export const evolve = (state: BookingState, event: BookingRequested): BookingState => {
  switch (event.type) {
    case 'BookingRequested':
      return {
        status: 'Pending',
        bookingId: event.data.bookingId,
      };
    default:
      return state;
  }
};
