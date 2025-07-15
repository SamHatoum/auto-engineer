import { IllegalStateError } from '@event-driven-io/emmett';
import type { ListingState } from './state';
import type { RemoveListing } from './commands';
import type { ListingRemoved } from './events';

export const decide = (command: RemoveListing, state: ListingState): ListingRemoved => {
  if (state.status !== 'Listed') {
    throw new IllegalStateError('Cannot remove a listing that is not listed');
  }
  return {
    type: 'ListingRemoved',
    data: {
      ...command.data,
      removedAt: new Date(),
    },
  };
};
