import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SearchFiltersProps {
  onFiltersChange: (filters: {
    location: string;
    priceRange: [number, number];
    guestCount: number;
  }) => void;
}

export const SearchFilters = ({ onFiltersChange }: SearchFiltersProps) => {
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [guestCount, setGuestCount] = useState(1);

  const handleLocationChange = (value: string) => {
    setLocation(value);
    onFiltersChange({ location: value, priceRange, guestCount });
  };

  const handlePriceRangeChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setPriceRange(newRange);
    onFiltersChange({ location, priceRange: newRange, guestCount });
  };

  const handleGuestCountChange = (value: string) => {
    const count = parseInt(value);
    setGuestCount(count);
    onFiltersChange({ location, priceRange, guestCount: count });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Search Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Enter location..."
            value={location}
            onChange={(e) => handleLocationChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Price Range: ${priceRange[0]} - ${priceRange[1]} per night</Label>
          <Slider
            value={priceRange}
            onValueChange={handlePriceRangeChange}
            max={1000}
            min={0}
            step={10}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guests">Number of Guests</Label>
          <Select value={guestCount.toString()} onValueChange={handleGuestCountChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select guests" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? "Guest" : "Guests"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};