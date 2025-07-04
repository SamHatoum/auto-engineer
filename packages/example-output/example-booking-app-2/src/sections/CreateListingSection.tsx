import { useState } from "react";
import { ListingForm } from "../components/ListingForm";
import { AmenitiesSelector } from "../components/AmenitiesSelector";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreateListingSectionProps {
  onListingCreated?: () => void;
}

interface CreateListingInput {
  title: string;
  description: string;
  location: string;
  address: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
}

const createListingMutation = async (input: CreateListingInput) => {
  // Mock API call - replace with actual GraphQL mutation
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    propertyId: Math.random().toString(36).substr(2, 9),
    title: input.title,
    location: input.location
  };
};

export const CreateListingSection = ({ onListingCreated }: CreateListingSectionProps) => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: createListingMutation,
    onSuccess: (data) => {
      toast.success(`Listing "${data.title}" created successfully!`);
      onListingCreated?.();
    },
    onError: (error) => {
      toast.error("Failed to create listing. Please try again.");
      console.error("Create listing error:", error);
    }
  });

  const handleFormSubmit = (formData: Omit<CreateListingInput, 'amenities'>) => {
    const listingData: CreateListingInput = {
      ...formData,
      amenities: selectedAmenities
    };
    
    mutation.mutate(listingData);
  };

  const handleAmenitiesChange = (amenities: string[]) => {
    setSelectedAmenities(amenities);
  };

  return (
    <div className="space-y-8">
      <ListingForm 
        onSubmit={handleFormSubmit}
        isLoading={mutation.isPending}
      />
      
      <div className="border-t pt-8">
        <h3 className="text-xl font-semibold mb-4">Amenities</h3>
        <AmenitiesSelector 
          selectedAmenities={selectedAmenities}
          onAmenitiesChange={handleAmenitiesChange}
        />
      </div>
    </div>
  );
};