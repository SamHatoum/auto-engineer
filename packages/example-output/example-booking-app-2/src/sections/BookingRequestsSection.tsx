import { useState, useEffect } from "react";
import { BookingRequestCard } from "../components/BookingRequestCard";

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
  requestDate: string;
}

export const BookingRequestsSection = () => {
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demonstration
    const mockRequests: BookingRequest[] = [
      {
        id: "1",
        guestName: "John Smith",
        propertyTitle: "Cozy Downtown Apartment",
        checkIn: "2024-03-15",
        checkOut: "2024-03-18",
        guests: 2,
        totalPrice: 450,
        status: "pending",
        requestDate: "2024-03-01"
      },
      {
        id: "2",
        guestName: "Sarah Johnson",
        propertyTitle: "Modern Loft with City View",
        checkIn: "2024-03-20",
        checkOut: "2024-03-25",
        guests: 4,
        totalPrice: 750,
        status: "pending",
        requestDate: "2024-03-02"
      },
      {
        id: "3",
        guestName: "Mike Wilson",
        propertyTitle: "Cozy Downtown Apartment",
        checkIn: "2024-02-28",
        checkOut: "2024-03-02",
        guests: 1,
        totalPrice: 300,
        status: "approved",
        requestDate: "2024-02-20"
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
        <h2 className="text-2xl font-semibold mb-6">Booking Requests</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const pendingRequests = bookingRequests.filter(req => req.status === "pending");
  const processedRequests = bookingRequests.filter(req => req.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-6">Pending Requests</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-muted-foreground">No pending booking requests</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <BookingRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>

      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {processedRequests.map((request) => (
              <BookingRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};