import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchFilters } from "../components/SearchFilters";
import { ListingCard } from "../components/ListingCard";

interface Listing {
  propertyId: string;
  title: string;
  location: string;
  pricePerNight: number;
  maxGuests: number;
}

interface SearchFilters {
  location: string;
  maxPrice: number;
  minGuests: number;
}

interface ListingSearchSectionProps {
  onListingClick: (listingId: string) => void;
}

const mockListings: Listing[] = [
  {
    propertyId: "1",
    title: "Cozy Downtown Apartment",
    location: "New York, NY",
    pricePerNight: 120,
    maxGuests: 4
  },
  {
    propertyId: "2",
    title: "Beachfront Villa",
    location: "Miami, FL",
    pricePerNight: 250,
    maxGuests: 8
  },
  {
    propertyId: "3",
    title: "Mountain Cabin Retreat",
    location: "Aspen, CO",
    pricePerNight: 180,
    maxGuests: 6
  },
  {
    propertyId: "4",
    title: "Modern City Loft",
    location: "San Francisco, CA",
    pricePerNight: 200,
    maxGuests: 2
  }
];

export const ListingSearchSection = ({ onListingClick }: ListingSearchSectionProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    maxPrice: 500,
    minGuests: 1
  });

  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["searchListings", filters],
    queryFn: async () => {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return mockListings.filter(listing => {
        const matchesLocation = !filters.location || 
          listing.location.toLowerCase().includes(filters.location.toLowerCase());
        const matchesPrice = listing.pricePerNight <= filters.maxPrice;
        const matchesGuests = listing.maxGuests >= filters.minGuests;
        
        return matchesLocation && matchesPrice && matchesGuests;
      });
    }
  });

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading listings. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchFilters 
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              {listings.length} {listings.length === 1 ? 'property' : 'properties'} found
            </p>
          </div>
          
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No properties found matching your criteria.
              </p>
              <p className="text-muted-foreground">
                Try adjusting your filters to see more results.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.propertyId}
                  listing={listing}
                  onClick={() => onListingClick(listing.propertyId)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};