import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MapPin, Users, Star } from "lucide-react";

interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  address: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
}

interface ListingCardProps {
  listing: Listing;
  onBook: (listingId: string) => void;
}

const ListingCard = ({ listing, onBook }: ListingCardProps) => {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
        {listing.imageUrl ? (
          <img 
            src={listing.imageUrl} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image Available
          </div>
        )}
      </div>
      
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{listing.title}</CardTitle>
          <div className="text-right">
            <div className="text-xl font-bold">${listing.pricePerNight}</div>
            <div className="text-sm text-muted-foreground">per night</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{listing.location}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Up to {listing.maxGuests} guests</span>
          </div>
          
          {listing.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm">{listing.rating}</span>
              {listing.reviewCount && (
                <span className="text-sm text-muted-foreground">({listing.reviewCount})</span>
              )}
            </div>
          )}
        </div>
        
        <CardDescription className="line-clamp-2">
          {listing.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-4">
          {listing.amenities.slice(0, 3).map((amenity) => (
            <Badge key={amenity} variant="secondary" className="text-xs">
              {amenity}
            </Badge>
          ))}
          {listing.amenities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{listing.amenities.length - 3} more
            </Badge>
          )}
        </div>
        
        <Button 
          onClick={() => onBook(listing.id)} 
          className="w-full"
        >
          Book Now
        </Button>
      </CardContent>
    </Card>
  );
};

export default ListingCard;