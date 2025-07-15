import type { Command } from '@event-driven-io/emmett';

export type CreateListing = Command<
  'CreateListing',
  {
    propertyId: string;
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
