import type { RequestBooking } from './commands';
import type { BookingRequested } from './events';
import type { BookingState } from './state';
import { IllegalStateError } from '@event-driven-io/emmett';

export const decide = (command: RequestBooking, state: BookingState): BookingRequested => {
  if (state.status !== 'Empty') {
    throw new IllegalStateError('Booking already exists.');
  }

  const { now, bookingId } = command.metadata;
  const { placeId, ...commandDataWithoutPlaceId } = command.data;

  return {
    type: 'BookingRequested',
    data: {
      ...commandDataWithoutPlaceId,
      listingId: placeId, // Map placeId to listingId for backend consistency
      bookingId,
      status: 'pending_host_approval',
      requestedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // +1 day
    },
  };
};
