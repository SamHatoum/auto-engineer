import { useState } from "react";
import { ListingForm } from "../modules/ListingForm";
import { AmenitiesSelector } from "../modules/AmenitiesSelector";

interface CreateListingData {
  title: string;
  description: string;
  location: string;
  address: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
}

interface CreateListingSectionProps {
  onListingCreated?: () => void;
}

export const CreateListingSection = ({ onListingCreated }: CreateListingSectionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const handleCreateListing = async (formData: Omit<CreateListingData, 'amenities'>) => {
    setIsSubmitting(true);
    
    try {
      const listingData: CreateListingData = {
        ...formData,
        amenities: selectedAmenities
      };

      // TODO: Replace with actual GraphQL mutation
      // mutation CreateListing($input: CreateListingInput!) { 
      //   createListing(input: $input) { 
      //     propertyId title location 
      //   } 
      // }
      
      console.log('Creating listing:', listingData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onListingCreated?.();
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmenitiesChange = (amenities: string[]) => {
    setSelectedAmenities(amenities);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
        <p className="text-muted-foreground">
          Share your space with guests around the world
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ListingForm 
            onSubmit={handleCreateListing}
            isSubmitting={isSubmitting}
          />
        </div>
        
        <div className="lg:col-span-1">
          <AmenitiesSelector 
            selectedAmenities={selectedAmenities}
            onAmenitiesChange={handleAmenitiesChange}
          />
        </div>
      </div>
    </div>
  );
};