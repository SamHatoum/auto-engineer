import { SearchResultsOrganism } from '../components/organisms/SearchResultsOrganism';

export const ListingSearchPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Stay</h1>
          <p className="text-lg text-gray-600">Discover amazing places to stay around the world</p>
        </div>
        <SearchResultsOrganism />
      </div>
    </div>
  );
};