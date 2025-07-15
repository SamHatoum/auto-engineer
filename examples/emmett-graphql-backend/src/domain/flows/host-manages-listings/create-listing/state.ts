export type EmptyListing = {
  status: 'Empty';
};

export type CreatedListing = {
  status: 'Created';
  listingId: string;
  hostId: string;
  location: string;
  address: string;
  title: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
};

export type ListingState = EmptyListing | CreatedListing;

export const initialState = (): ListingState => ({
  status: 'Empty',
});
