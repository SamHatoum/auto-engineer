import type { Command } from '@event-driven-io/emmett';

export type RemoveListing = Command<
  'RemoveListing',
  {
    listingId: string;
    hostId: string;
  }
>;
