import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";

interface SearchFiltersProps {
  onFiltersChange: (filters: {
    location: string;
    maxPrice: number;
    minGuests: number;
  }) => void;
}

export const SearchFilters = ({ onFiltersChange }: SearchFiltersProps) => {
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState([1000]);
  const [minGuests, setMinGuests] = useState("1");

  const handleApplyFilters = () => {
    onFiltersChange({
      location,
      maxPrice: maxPrice[0],
      minGuests: parseInt(minGuests),
    });
  };

  const handleClearFilters = () => {
    setLocation("");
    setMaxPrice([1000]);
    setMinGuests("1");
    onFiltersChange({
      location: "",
      maxPrice: 1000,
      minGuests: 1,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
      <h3 className="text-lg font-semibold">Search Filters</h3>
      
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="Enter city or destination"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Max Price per Night: ${maxPrice[0]}</Label>
        <Slider
          value={maxPrice}
          onValueChange={setMaxPrice}
          max={2000}
          min={50}
          step={50}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>$50</span>
          <span>$2000+</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guests">Minimum Guests</Label>
        <Select value={minGuests} onValueChange={setMinGuests}>
          <SelectTrigger>
            <SelectValue placeholder="Select guest count" />
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

      <div className="flex gap-3">
        <Button onClick={handleApplyFilters} className="flex-1">
          Apply Filters
        </Button>
        <Button onClick={handleClearFilters} variant="outline" className="flex-1">
          Clear
        </Button>
      </div>
    </div>
  );
};