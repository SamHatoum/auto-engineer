export interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  address: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  hostId: string;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  guestCount?: number;
}

export interface BookingRequest {
  listingId: string;
  guestId: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  totalPrice: number;
}

export interface CreateListingData {
  title: string;
  description: string;
  location: string;
  address: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
}