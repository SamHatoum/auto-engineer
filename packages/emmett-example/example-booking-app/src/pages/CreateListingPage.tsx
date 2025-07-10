import { CreateListingOrganism } from '../components/organisms/CreateListingOrganism';

export const CreateListingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Listing</h1>
          <p className="text-lg text-gray-600">Share your space with guests around the world</p>
        </div>
        <CreateListingOrganism />
      </div>
    </div>
  );
};