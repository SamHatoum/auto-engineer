import { useState, useEffect } from "react";
import { SearchFilters } from "../modules/SearchFilters";
import { ListingCard } from "../modules/ListingCard";

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

export const ListingSearchSection = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    maxPrice: 1000,
    minGuests: 1
  });

  const searchListings = async (searchFilters: SearchFilters) => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual GraphQL query
      const mockListings: Listing[] = [
        {
          propertyId: "1",
          title: "Cozy Downtown Apartment",
          location: "New York, NY",
          pricePerNight: 150,
          maxGuests: 4
        },
        {
          propertyId: "2",
          title: "Beachfront Villa",
          location: "Miami, FL",
          pricePerNight: 300,
          maxGuests: 8
        },
        {
          propertyId: "3",
          title: "Mountain Cabin Retreat",
          location: "Aspen, CO",
          pricePerNight: 200,
          maxGuests: 6
        }
      ];

      // Filter mock data based on search criteria
      const filteredListings = mockListings.filter(listing => {
        const matchesLocation = !searchFilters.location || 
          listing.location.toLowerCase().includes(searchFilters.location.toLowerCase());
        const matchesPrice = listing.pricePerNight <= searchFilters.maxPrice;
        const matchesGuests = listing.maxGuests >= searchFilters.minGuests;
        
        return matchesLocation && matchesPrice && matchesGuests;
      });

      setListings(filteredListings);
    } catch (error) {
      console.error("Error searching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchListings(filters);
  }, []);

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    searchListings(newFilters);
  };

  const handleListingClick = (propertyId: string) => {
    // Navigation will be handled by parent component or router
    console.log("Navigate to listing:", propertyId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <SearchFilters 
          filters={filters}
          onFiltersChange={handleFilterChange}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">Searching listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">No listings found matching your criteria.</p>
          </div>
        ) : (
          listings.map((listing) => (
            <ListingCard
              key={listing.propertyId}
              listing={listing}
              onClick={() => handleListingClick(listing.propertyId)}
            />
          ))
        )}
      </div>
    </div>
  );
};