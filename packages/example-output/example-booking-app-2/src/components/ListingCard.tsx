import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface ListingCardProps {
  listing: {
    propertyId: string;
    title: string;
    location: string;
    pricePerNight: number;
    maxGuests: number;
    imageUrl?: string;
  };
  onClick?: (listingId: string) => void;
}

export const ListingCard = ({ listing, onClick }: ListingCardProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(listing.propertyId);
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
        {listing.imageUrl ? (
          <img 
            src={listing.imageUrl} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No Image Available
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-1">{listing.title}</CardTitle>
          <Badge variant="secondary" className="ml-2 shrink-0">
            ${listing.pricePerNight}/night
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          {listing.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Up to {listing.maxGuests} guests</span>
        </div>
      </CardContent>
    </Card>
  );
};