import type { Event } from '@event-driven-io/emmett';

export type ListingRemoved = Event<
  'ListingRemoved',
  {
    listingId: string;
    hostId: string;
    removedAt: Date;
  }
>;
