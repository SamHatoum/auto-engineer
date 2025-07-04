import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Slider } from "../ui/slider";

interface SearchFiltersProps {
  onSearch: (filters: {
    location: string;
    maxPrice: number;
    minGuests: number;
  }) => void;
}

export const SearchFilters = ({ onSearch }: SearchFiltersProps) => {
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState([500]);
  const [minGuests, setMinGuests] = useState("");

  const handleSearch = () => {
    onSearch({
      location,
      maxPrice: maxPrice[0],
      minGuests: parseInt(minGuests) || 1,
    });
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border">
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="Enter destination"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Max Price per Night: ${maxPrice[0]}</Label>
        <Slider
          value={maxPrice}
          onValueChange={setMaxPrice}
          max={1000}
          min={50}
          step={25}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guests">Number of Guests</Label>
        <Select value={minGuests} onValueChange={setMinGuests}>
          <SelectTrigger>
            <SelectValue placeholder="Select guests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Guest</SelectItem>
            <SelectItem value="2">2 Guests</SelectItem>
            <SelectItem value="3">3 Guests</SelectItem>
            <SelectItem value="4">4 Guests</SelectItem>
            <SelectItem value="5">5 Guests</SelectItem>
            <SelectItem value="6">6+ Guests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSearch} className="w-full">
        Search Properties
      </Button>
    </div>
  );
};