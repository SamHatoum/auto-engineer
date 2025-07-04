import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateListingSection } from "../sections/CreateListingSection";

const CreateListingPage = () => {
  const navigate = useNavigate();

  const handleListingCreated = () => {
    navigate("/host/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
            <p className="text-muted-foreground">
              Add your property details to start hosting guests
            </p>
          </div>
          <CreateListingSection onListingCreated={handleListingCreated} />
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;