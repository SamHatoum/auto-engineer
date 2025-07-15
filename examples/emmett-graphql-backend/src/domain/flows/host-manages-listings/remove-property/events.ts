import type { Event } from '@event-driven-io/emmett';

export type PropertyRemoved = Event<
  'PropertyRemoved',
  {
    propertyId: string;
    hostId: string;
    removedAt: Date;
  }
>;
