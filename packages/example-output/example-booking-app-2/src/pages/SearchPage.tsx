import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListingSearchSection } from "../sections/ListingSearchSection";

const SearchPage = () => {
  const navigate = useNavigate();

  const handleListingClick = (listingId: string) => {
    navigate(`/listing/${listingId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Your Perfect Stay</h1>
          <p className="text-muted-foreground">
            Discover amazing places to stay around the world
          </p>
        </div>
        <ListingSearchSection onListingClick={handleListingClick} />
      </div>
    </div>
  );
};

export default SearchPage;