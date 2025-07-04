import { useState, useEffect } from "react";
import { BookingRequestCard } from "../modules/BookingRequestCard";

interface BookingRequest {
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
}

export const BookingRequestsSection = () => {
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demonstration
    const mockRequests: BookingRequest[] = [
      {
        id: "1",
        guestName: "John Doe",
        propertyTitle: "Cozy Downtown Apartment",
        checkIn: "2024-02-15",
        checkOut: "2024-02-18",
        guests: 2,
        totalPrice: 450,
        status: "pending",
        message: "Looking forward to staying at your beautiful place!"
      },
      {
        id: "2",
        guestName: "Sarah Smith",
        propertyTitle: "Modern Studio Loft",
        checkIn: "2024-02-20",
        checkOut: "2024-02-25",
        guests: 1,
        totalPrice: 625,
        status: "pending",
        message: "Business trip, will be very respectful of your space."
      }
    ];

    setTimeout(() => {
      setBookingRequests(mockRequests);
      setLoading(false);
    }, 1000);
  }, []);

  const handleApprove = (requestId: string) => {
    setBookingRequests(prev =>
      prev.map(request =>
        request.id === requestId
          ? { ...request, status: "approved" as const }
          : request
      )
    );
  };

  const handleReject = (requestId: string) => {
    setBookingRequests(prev =>
      prev.map(request =>
        request.id === requestId
          ? { ...request, status: "rejected" as const }
          : request
      )
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Booking Requests</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Booking Requests</h2>
        <div className="text-sm text-muted-foreground">
          {bookingRequests.filter(r => r.status === "pending").length} pending requests
        </div>
      </div>

      {bookingRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No booking requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingRequests.map(request => (
            <BookingRequestCard
              key={request.id}
              request={request}
              onApprove={() => handleApprove(request.id)}
              onReject={() => handleReject(request.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};