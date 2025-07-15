export type EmptyListing = {
  status: 'Empty';
};

export type ListedListing = {
  status: 'Listed';
  listingId: string;
};

export type RemovedListing = {
  status: 'Removed';
  listingId: string;
};

export type ListingState = ListedListing | RemovedListing | EmptyListing;

export const initialListingState = (): ListingState => ({
  status: 'Empty',
});
