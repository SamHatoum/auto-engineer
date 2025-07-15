import { describe, it } from 'vitest';
import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialBookingState } from './state';

describe('Booking | RequestBooking', () => {
  const now = new Date('2025-06-10T16:30:00Z');
  const given = DeciderSpecification.for({
    decide,
    evolve,
    initialState: initialBookingState,
  });

  it('should emit BookingRequested when booking is new', () => {
    given([])
      .when({
        type: 'RequestBooking',
        data: {
          propertyId: 'prop_789',
          hostId: 'host_123',
          guestId: 'guest_456',
          checkIn: '2025-07-15',
          checkOut: '2025-07-18',
          guests: 2,
          message: 'Hey',
        },
        metadata: {
          now,
          bookingId: 'book_xyz789',
        },
      })
      .then([
        {
          type: 'BookingRequested',
          data: {
            bookingId: 'book_xyz789',
            hostId: 'host_123',
            propertyId: 'prop_789',
            guestId: 'guest_456',
            checkIn: '2025-07-15',
            checkOut: '2025-07-18',
            guests: 2,
            message: 'Hey',
            status: 'pending_host_approval',
            requestedAt: '2025-06-10T16:30:00.000Z',
            expiresAt: '2025-06-11T16:30:00.000Z',
          },
        },
      ]);
  });

  it('should throw if booking already exists', () => {
    given([
      {
        type: 'BookingRequested',
        data: {
          bookingId: 'book_xyz789',
          hostId: 'host_123',
          propertyId: 'prop_789',
          guestId: 'guest_456',
          checkIn: '2025-07-15',
          checkOut: '2025-07-18',
          guests: 2,
          message: 'Hey',
          status: 'pending_host_approval',
          requestedAt: '2025-06-10T16:30:00.000Z',
          expiresAt: '2025-06-11T16:30:00.000Z',
        },
      },
    ])
      .when({
        type: 'RequestBooking',
        data: {
          propertyId: 'prop_789',
          hostId: 'host_123',
          guestId: 'guest_456',
          checkIn: '2025-07-15',
          checkOut: '2025-07-18',
          guests: 2,
          message: 'Hey',
        },
        metadata: {
          now,
          bookingId: 'book_xyz789',
        },
      })
      .thenThrows((e) => e.message === 'Booking already exists.');
  });
});
