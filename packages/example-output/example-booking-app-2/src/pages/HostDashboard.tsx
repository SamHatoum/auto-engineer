import { Button } from "../components/ui/button";
import { BookingRequestsSection } from "../sections/BookingRequestsSection";
import { useNavigate } from "react-router-dom";

const HostDashboard = () => {
  const navigate = useNavigate();

  const handleCreateListingClick = () => {
    navigate("/host/create-listing");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Host Dashboard</h1>
          <Button onClick={handleCreateListingClick}>
            Create New Listing
          </Button>
        </div>
        <BookingRequestsSection />
      </div>
    </div>
  );
};

export default HostDashboard;