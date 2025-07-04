import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

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
}

export interface SearchFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  guestCount?: number;
}

export interface BookingData {
  listingId: string;
  guestId: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
}

// Mock API functions - replace with actual API calls
const mockListings: Listing[] = [];

const searchListings = async (filters: SearchFilters): Promise<Listing[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return mockListings.filter(listing => {
    if (filters.location && !listing.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    if (filters.minPrice && listing.pricePerNight < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice && listing.pricePerNight > filters.maxPrice) {
      return false;
    }
    if (filters.guestCount && listing.maxGuests < filters.guestCount) {
      return false;
    }
    return true;
  });
};

const createListing = async (listingData: Omit<Listing, 'id' | 'createdAt'>): Promise<Listing> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const newListing: Listing = {
    ...listingData,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
  };
  
  mockListings.push(newListing);
  return newListing;
};

const bookListing = async (bookingData: BookingData): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Simulate notifying host
  console.log('Host notified of booking:', bookingData);
};

export const useListings = (filters: SearchFilters = {}) => {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => searchListings(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateListing = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({
        title: "Success",
        description: "Listing created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useBookListing = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: bookListing,
    onSuccess: () => {
      toast({
        title: "Booking Confirmed",
        description: "Your booking has been confirmed! The host has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "Failed to book listing. Please try again.",
        variant: "destructive",
      });
    },
  });
};