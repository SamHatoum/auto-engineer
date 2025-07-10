import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListingForm } from '../molecules/ListingForm';
import { useToast } from '@/hooks/use-toast';

export interface CreateListingOrganismProps {
  className?: string;
}

export const CreateListingOrganism = ({ className = '' }: CreateListingOrganismProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    console.log('CreateListingOrganism: Starting listing creation', formData);
    setIsSubmitting(true);

    try {
      // Simulate API call since no mutation is available
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('CreateListingOrganism: Listing created successfully');
      
      toast({
        title: "Listing Created",
        description: "Your property listing has been created successfully!",
      });

      // Navigate to search page since HostDashboardPage doesn't exist
      navigate('/search');
    } catch (error) {
      console.error('CreateListingOrganism: Error creating listing', error);
      
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Listing</h1>
        <p className="text-lg text-gray-600">
          Share your space with guests and start earning today
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <ListingForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};