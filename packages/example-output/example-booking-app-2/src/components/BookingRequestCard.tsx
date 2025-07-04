import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface BookingRequestCardProps {
  id: string;
  guestName: string;
  guestAvatar?: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "approved" | "rejected";
  message?: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const BookingRequestCard = ({
  id,
  guestName,
  guestAvatar,
  propertyTitle,
  checkIn,
  checkOut,
  guests,
  totalPrice,
  status,
  message,
  onApprove,
  onReject,
}: BookingRequestCardProps) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={guestAvatar} alt={guestName} />
              <AvatarFallback>
                {guestName.split(" ").map(n => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{guestName}</CardTitle>
              <CardDescription>{propertyTitle}</CardDescription>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Check-in</p>
              <p className="text-muted-foreground">{formatDate(checkIn)}</p>
            </div>
            <div>
              <p className="font-medium">Check-out</p>
              <p className="text-muted-foreground">{formatDate(checkOut)}</p>
            </div>
            <div>
              <p className="font-medium">Guests</p>
              <p className="text-muted-foreground">{guests}</p>
            </div>
            <div>
              <p className="font-medium">Total Price</p>
              <p className="text-muted-foreground">${totalPrice}</p>
            </div>
          </div>
          
          {message && (
            <div>
              <p className="font-medium text-sm mb-1">Message from guest:</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {message}
              </p>
            </div>
          )}

          {status === "pending" && (
            <div className="flex space-x-2 pt-2">
              <Button
                onClick={() => onApprove?.(id)}
                className="flex-1"
              >
                Approve
              </Button>
              <Button
                onClick={() => onReject?.(id)}
                variant="outline"
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};