import type { Event } from '@event-driven-io/emmett';

export type BookingRequested = Event<
  'BookingRequested',
  {
    bookingId: string;
    listingId: string;
    hostId: string;
    guestId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    message: string;
    status: 'pending_host_approval' | 'confirmed' | 'cancelled';
    requestedAt: string;
    expiresAt: string;
  }
>;
