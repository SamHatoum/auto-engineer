import type { ListingState } from './state';
import type { ListingRemoved } from './events';
import { ListingCreated } from '../create-listing';

export const evolve = (state: ListingState, event: ListingRemoved | ListingCreated): ListingState => {
  switch (event.type) {
    case 'ListingCreated':
      // This slice cares that a listing became "Listed"
      // because it needs to know it can be removed
      return {
        status: 'Listed',
        listingId: event.data.listingId,
      };
    case 'ListingRemoved':
      return {
        status: 'Removed',
        listingId: event.data.listingId,
      };
    default:
      return state;
  }
};
