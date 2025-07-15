import type { Event } from '@event-driven-io/emmett';

export type ListingCreated = Event<
  'ListingCreated',
  {
    listingId: string;
    hostId: string;
    location: string;
    address: string;
    title: string;
    description: string;
    pricePerNight: number;
    maxGuests: number;
    amenities: string[];
    listedAt: Date;
  }
>;
