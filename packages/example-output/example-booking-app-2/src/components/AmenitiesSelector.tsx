import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

interface AmenitiesSelectorProps {
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
}

const AVAILABLE_AMENITIES = [
  "WiFi",
  "Kitchen",
  "Washing Machine",
  "Air Conditioning",
  "Heating",
  "TV",
  "Parking",
  "Pool",
  "Gym",
  "Pet Friendly",
  "Smoking Allowed",
  "Balcony",
  "Garden",
  "Hot Tub",
  "Fireplace",
  "Dishwasher",
  "Microwave",
  "Coffee Maker",
  "Hair Dryer",
  "Iron"
];

export const AmenitiesSelector = ({ selectedAmenities, onAmenitiesChange }: AmenitiesSelectorProps) => {
  const handleAmenityToggle = (amenity: string) => {
    const isSelected = selectedAmenities.includes(amenity);
    if (isSelected) {
      onAmenitiesChange(selectedAmenities.filter(a => a !== amenity));
    } else {
      onAmenitiesChange([...selectedAmenities, amenity]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Amenities</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Select all amenities available at your property
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {AVAILABLE_AMENITIES.map((amenity) => (
          <div key={amenity} className="flex items-center space-x-2">
            <Checkbox
              id={amenity}
              checked={selectedAmenities.includes(amenity)}
              onCheckedChange={() => handleAmenityToggle(amenity)}
            />
            <Label
              htmlFor={amenity}
              className="text-sm font-normal cursor-pointer"
            >
              {amenity}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};