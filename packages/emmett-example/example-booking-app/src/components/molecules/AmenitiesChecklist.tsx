import { Checkbox } from '../atoms/checkbox';
import { Label } from '../atoms/label';

export interface AmenitiesChecklistProps {
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  className?: string;
}

const COMMON_AMENITIES = [
  'WiFi',
  'Kitchen',
  'Washer',
  'Dryer',
  'Air conditioning',
  'Heating',
  'Dedicated workspace',
  'TV',
  'Hair dryer',
  'Iron',
  'Pool',
  'Hot tub',
  'Free parking',
  'Gym',
  'Breakfast',
  'Laptop friendly workspace',
  'Crib',
  'Self check-in',
  'Smoke alarm',
  'Carbon monoxide alarm'
];

export const AmenitiesChecklist = ({ 
  selectedAmenities, 
  onAmenitiesChange, 
  className = '' 
}: AmenitiesChecklistProps) => {
  const handleAmenityToggle = (amenity: string) => {
    console.log('Toggling amenity:', amenity);
    
    if (selectedAmenities.includes(amenity)) {
      const updated = selectedAmenities.filter(item => item !== amenity);
      onAmenitiesChange(updated);
      console.log('Removed amenity, updated list:', updated);
    } else {
      const updated = [...selectedAmenities, amenity];
      onAmenitiesChange(updated);
      console.log('Added amenity, updated list:', updated);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {COMMON_AMENITIES.map((amenity) => (
          <div key={amenity} className="flex items-center space-x-3">
            <Checkbox
              id={`amenity-${amenity}`}
              checked={selectedAmenities.includes(amenity)}
              onCheckedChange={() => handleAmenityToggle(amenity)}
              className="h-4 w-4"
            />
            <Label
              htmlFor={`amenity-${amenity}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {amenity}
            </Label>
          </div>
        ))}
      </div>
      
      {selectedAmenities.length > 0 && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Selected amenities: {selectedAmenities.length}
          </p>
        </div>
      )}
    </div>
  );
};