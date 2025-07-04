import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

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
  "Hot Tub",
  "Pool",
  "Gym",
  "Parking",
  "Pets Allowed",
  "Smoking Allowed",
  "Wheelchair Accessible",
  "Elevator",
  "Fireplace",
  "Balcony",
  "Garden",
  "BBQ Grill",
  "Beach Access",
  "Ski Access"
];

const AmenitiesSelector = ({ selectedAmenities, onAmenitiesChange }: AmenitiesSelectorProps) => {
  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (checked) {
      onAmenitiesChange([...selectedAmenities, amenity]);
    } else {
      onAmenitiesChange(selectedAmenities.filter(a => a !== amenity));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Amenities</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {AVAILABLE_AMENITIES.map((amenity) => (
          <div key={amenity} className="flex items-center space-x-2">
            <Checkbox
              id={amenity}
              checked={selectedAmenities.includes(amenity)}
              onCheckedChange={(checked) => handleAmenityChange(amenity, checked as boolean)}
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

export default AmenitiesSelector;