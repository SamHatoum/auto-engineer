import { IllegalStateError } from '@event-driven-io/emmett';
import type { ListingState } from './state';
import type { CreateListing } from './commands';
import { ListingCreated } from './events';

export const decide = (command: CreateListing, state: ListingState): ListingCreated => {
  if (command.type !== 'CreateListing') {
    throw new IllegalStateError(`Unexpected command type: ${command.type}`);
  }
  if (state.status !== 'Empty') {
    throw new IllegalStateError('Listing already exists');
  }
  return {
    type: 'ListingCreated',
    data: {
      ...command.data,
      listedAt: new Date(),
    },
  };
};
