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
  createdAt: string;
}

export interface BookingRequest {
  id: string;
  listingId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface SearchFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
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

// Mock data for development
const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Cozy Downtown Apartment',
    description: 'Beautiful apartment in the heart of the city',
    location: 'New York, NY',
    address: '123 Main St, New York, NY 10001',
    pricePerNight: 150,
    maxGuests: 4,
    amenities: ['WiFi', 'Kitchen', 'Air Conditioning'],
    hostId: 'host1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Beachfront Villa',
    description: 'Stunning villa with ocean views',
    location: 'Miami, FL',
    address: '456 Ocean Dr, Miami, FL 33139',
    pricePerNight: 300,
    maxGuests: 8,
    amenities: ['WiFi', 'Pool', 'Beach Access', 'Kitchen'],
    hostId: 'host2',
    createdAt: new Date().toISOString(),
  },
];

export const searchListings = async (filters: SearchFilters = {}): Promise<Listing[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let filteredListings = [...mockListings];
  
  if (filters.location) {
    filteredListings = filteredListings.filter(listing =>
      listing.location.toLowerCase().includes(filters.location!.toLowerCase())
    );
  }
  
  if (filters.minPrice !== undefined) {
    filteredListings = filteredListings.filter(listing =>
      listing.pricePerNight >= filters.minPrice!
    );
  }
  
  if (filters.maxPrice !== undefined) {
    filteredListings = filteredListings.filter(listing =>
      listing.pricePerNight <= filters.maxPrice!
    );
  }
  
  if (filters.guests) {
    filteredListings = filteredListings.filter(listing =>
      listing.maxGuests >= filters.guests!
    );
  }
  
  return filteredListings;
};

export const createListing = async (data: CreateListingData): Promise<Listing> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const newListing: Listing = {
    id: Date.now().toString(),
    ...data,
    hostId: 'current-user', // In real app, this would come from auth
    createdAt: new Date().toISOString(),
  };
  
  // In real app, this would make an API call
  mockListings.push(newListing);
  
  return newListing;
};

export const createBooking = async (listingId: string, guestCount: number): Promise<BookingRequest> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const listing = mockListings.find(l => l.id === listingId);
  if (!listing) {
    throw new Error('Listing not found');
  }
  
  const booking: BookingRequest = {
    id: Date.now().toString(),
    listingId,
    guestId: 'current-guest',
    checkIn: new Date().toISOString(),
    checkOut: new Date(Date.now() + 86400000).toISOString(), // Next day
    guests: guestCount,
    totalPrice: listing.pricePerNight,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  // In real app, this would notify the host
  console.log('Host notified of new booking:', booking);
  
  return booking;
};