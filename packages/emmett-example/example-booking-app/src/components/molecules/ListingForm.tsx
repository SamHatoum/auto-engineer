import { useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { Label } from '@/components/atoms/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { AmenitiesChecklist } from './AmenitiesChecklist';

export interface ListingFormProps {
  onSubmit: (data: ListingFormData) => void;
  initialData?: Partial<ListingFormData>;
  isLoading?: boolean;
}

export interface ListingFormData {
  title: string;
  location: string;
  pricePerNight: number;
  maxGuests: number;
  description: string;
  amenities: string[];
}

export const ListingForm = ({ onSubmit, initialData, isLoading = false }: ListingFormProps) => {
  const [formData, setFormData] = useState<ListingFormData>({
    title: initialData?.title || '',
    location: initialData?.location || '',
    pricePerNight: initialData?.pricePerNight || 0,
    maxGuests: initialData?.maxGuests || 1,
    description: initialData?.description || '',
    amenities: initialData?.amenities || [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ListingFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ListingFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formData.pricePerNight <= 0) {
      newErrors.pricePerNight = 'Price must be greater than 0';
    }

    if (formData.maxGuests < 1) {
      newErrors.maxGuests = 'Must accommodate at least 1 guest';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ListingForm: Form submission attempted', formData);
    
    if (validateForm()) {
      console.log('ListingForm: Validation passed, submitting data');
      onSubmit(formData);
    } else {
      console.log('ListingForm: Validation failed', errors);
    }
  };

  const handleInputChange = (field: keyof ListingFormData, value: string | number | string[]) => {
    console.log(`ListingForm: Field ${field} changed to:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAmenitiesChange = (amenities: string[]) => {
    handleInputChange('amenities', amenities);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          {initialData ? 'Edit Listing' : 'Create New Listing'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Property Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter a descriptive title for your property"
              className={errors.title ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">
              Location *
            </Label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="City, State or Address"
              className={errors.location ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerNight" className="text-sm font-medium">
                Price per Night ($) *
              </Label>
              <Input
                id="pricePerNight"
                type="number"
                min="1"
                step="0.01"
                value={formData.pricePerNight || ''}
                onChange={(e) => handleInputChange('pricePerNight', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={errors.pricePerNight ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.pricePerNight && (
                <p className="text-sm text-red-500">{errors.pricePerNight}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxGuests" className="text-sm font-medium">
                Maximum Guests *
              </Label>
              <Select
                value={formData.maxGuests.toString()}
                onValueChange={(value) => handleInputChange('maxGuests', parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.maxGuests ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select max guests" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.maxGuests && (
                <p className="text-sm text-red-500">{errors.maxGuests}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your property, its features, and what makes it special..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Amenities</Label>
            <AmenitiesChecklist
              selectedAmenities={formData.amenities}
              onAmenitiesChange={handleAmenitiesChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="px-8 py-2"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update Listing' : 'Create Listing'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};