import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";

interface ListingCardProps {
  propertyId: string;
  title: string;
  location: string;
  pricePerNight: number;
  maxGuests: number;
  imageUrl?: string;
  status?: string;
  onClick?: () => void;
}

const ListingCard = ({
  title,
  location,
  pricePerNight,
  maxGuests,
  imageUrl,
  status,
  onClick
}: ListingCardProps) => {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="p-0">
        <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg truncate">{title}</h3>
          {status && (
            <Badge variant="secondary" className="ml-2">
              {status}
            </Badge>
          )}
        </div>
        <p className="text-gray-600 text-sm mb-2">{location}</p>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">${pricePerNight}/night</span>
          <span className="text-sm text-gray-500">{maxGuests} guests max</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ListingCard;