import { useState } from 'react';
import { Input } from '@/components/atoms/input';
import { Slider } from '@/components/atoms/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Label } from '@/components/atoms/label';
import { MapPin, DollarSign, Users, Search } from 'lucide-react';

export interface SearchFiltersProps {
  onFiltersChange: (filters: {
    location: string;
    maxPrice: number;
    minGuests: number;
  }) => void;
  isLoading?: boolean;
}

export const SearchFilters = ({ onFiltersChange, isLoading = false }: SearchFiltersProps) => {
  const [location, setLocation] = useState('');
  const [priceRange, setPriceRange] = useState([500]);
  const [guestCount, setGuestCount] = useState('1');

  const handleSearch = () => {
    console.log('SearchFilters: Applying filters', {
      location,
      maxPrice: priceRange[0],
      minGuests: parseInt(guestCount)
    });
    
    onFiltersChange({
      location,
      maxPrice: priceRange[0],
      minGuests: parseInt(guestCount)
    });
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    console.log('SearchFilters: Location changed to', value);
  };

  const handlePriceChange = (value: number[]) => {
    setPriceRange(value);
    console.log('SearchFilters: Price range changed to', value[0]);
  };

  const handleGuestCountChange = (value: string) => {
    setGuestCount(value);
    console.log('SearchFilters: Guest count changed to', value);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-600" />
          Find Your Perfect Stay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Location Filter */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              Location
            </Label>
            <Input
              id="location"
              type="text"
              placeholder="Where are you going?"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Price Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              Max Price per Night
            </Label>
            <div className="px-2">
              <Slider
                value={priceRange}
                onValueChange={handlePriceChange}
                max={1000}
                min={50}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>$50</span>
                <span className="font-medium text-blue-600">${priceRange[0]}</span>
                <span>$1000+</span>
              </div>
            </div>
          </div>

          {/* Guest Count Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              Guests
            </Label>
            <Select value={guestCount} onValueChange={handleGuestCountChange}>
              <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Number of guests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Guest</SelectItem>
                <SelectItem value="2">2 Guests</SelectItem>
                <SelectItem value="3">3 Guests</SelectItem>
                <SelectItem value="4">4 Guests</SelectItem>
                <SelectItem value="5">5 Guests</SelectItem>
                <SelectItem value="6">6 Guests</SelectItem>
                <SelectItem value="7">7 Guests</SelectItem>
                <SelectItem value="8">8+ Guests</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Properties
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};