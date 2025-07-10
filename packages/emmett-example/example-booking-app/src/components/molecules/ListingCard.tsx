import { Card, CardContent } from '../atoms/card';
import { Badge } from '../atoms/badge';
import { Button } from '../atoms/button';
import { MapPin, Users, Star } from 'lucide-react';

export interface ListingCardProps {
  propertyId: string;
  title: string;
  location: string;
  pricePerNight: number;
  maxGuests: number;
  imageUrl?: string;
  rating?: number;
  onCardClick?: (propertyId: string) => void;
}

export const ListingCard = ({
  propertyId,
  title,
  location,
  pricePerNight,
  maxGuests,
  imageUrl,
  rating,
  onCardClick
}: ListingCardProps) => {
  const handleClick = () => {
    console.log('Listing card clicked:', propertyId);
    onCardClick?.(propertyId);
  };

  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0 shadow-sm bg-white"
      onClick={handleClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-sm font-medium">No Image</div>
          </div>
        )}
        {rating && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-900">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-gray-700 transition-colors">
            {title}
          </h3>
          
          <div className="flex items-center gap-1 text-gray-600">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm truncate">{location}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="w-4 h-4" />
            <span className="text-sm">{maxGuests} guests</span>
          </div>
          
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
            ${pricePerNight}/night
          </Badge>
        </div>
        
        <Button 
          className="w-full mt-3 bg-gray-900 hover:bg-gray-800 text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};