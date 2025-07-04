import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  address: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
}

const SearchListings = () => {
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [guestCount, setGuestCount] = useState("");
  const [listings] = useState<Listing[]>([
    {
      id: "1",
      title: "Cozy Downtown Apartment",
      description: "Beautiful apartment in the heart of the city",
      location: "New York",
      address: "123 Main St, New York, NY",
      pricePerNight: 150,
      maxGuests: 4,
      amenities: ["WiFi", "Kitchen", "Air Conditioning"]
    },
    {
      id: "2",
      title: "Beachfront Villa",
      description: "Stunning villa with ocean views",
      location: "Miami",
      address: "456 Ocean Dr, Miami, FL",
      pricePerNight: 300,
      maxGuests: 8,
      amenities: ["WiFi", "Pool", "Beach Access", "Kitchen"]
    }
  ]);

  const filteredListings = listings.filter(listing => {
    const matchesLocation = !location || listing.location.toLowerCase().includes(location.toLowerCase());
    const matchesPrice = listing.pricePerNight >= priceRange[0] && listing.pricePerNight <= priceRange[1];
    const matchesGuests = !guestCount || listing.maxGuests >= parseInt(guestCount);
    
    return matchesLocation && matchesPrice && matchesGuests;
  });

  const handleBooking = (listingId: string) => {
    // TODO: Implement booking logic and host notification
    console.log("Booking listing:", listingId);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Search Listings</h1>
        
        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Location Filter */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Guest Count Filter */}
              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <Select value={guestCount} onValueChange={setGuestCount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select guests" />
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

              {/* Price Range Slider */}
              <div className="space-y-2">
                <Label>Price Range: ${priceRange[0]} - ${priceRange[1]} per night</Label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={1000}
                  min={0}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} found
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardDescription>{listing.location}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{listing.description}</p>
                  <p className="text-sm">{listing.address}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {listing.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold">${listing.pricePerNight}/night</p>
                      <p className="text-sm text-muted-foreground">Max {listing.maxGuests} guests</p>
                    </div>
                    <Button onClick={() => handleBooking(listing.id)}>
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredListings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">No listings match your criteria</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchListings;