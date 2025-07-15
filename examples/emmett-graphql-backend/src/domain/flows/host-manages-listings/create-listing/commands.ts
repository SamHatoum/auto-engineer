import type { Command } from '@event-driven-io/emmett';

export type CreateListing = Command<
  'CreateListing',
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
  }
>;
