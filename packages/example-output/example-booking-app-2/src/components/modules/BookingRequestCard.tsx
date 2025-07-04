import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface BookingRequestCardProps {
  guestName: string;
  guestAvatar?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "approved" | "rejected";
  message?: string;
  onApprove?: () => void;
  onReject?: () => void;
}

const BookingRequestCard = ({
  guestName,
  guestAvatar,
  checkIn,
  checkOut,
  guests,
  totalPrice,
  status,
  message,
  onApprove,
  onReject,
}: BookingRequestCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={guestAvatar} alt={guestName} />
            <AvatarFallback>{guestName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{guestName}</h3>
            <p className="text-sm text-muted-foreground">{guests} guests</p>
          </div>
        </div>
        <Badge className={getStatusColor(status)}>{status}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Check-in:</span>
            <span>{checkIn}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Check-out:</span>
            <span>{checkOut}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>${totalPrice}</span>
          </div>
          {message && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}
          {status === "pending" && (
            <div className="flex space-x-2 pt-2">
              <Button onClick={onApprove} className="flex-1">
                Approve
              </Button>
              <Button onClick={onReject} variant="outline" className="flex-1">
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingRequestCard;