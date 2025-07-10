import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { SearchListings } from '@/graphql/queries';
import { SearchFilters } from '@/components/molecules/SearchFilters';
import { ListingGrid } from '@/components/molecules/ListingGrid';
import { Alert, AlertDescription } from '@/components/atoms/alert';
import { Skeleton } from '@/components/atoms/skeleton';

export interface SearchResultsOrganismProps {
  className?: string;
}

export const SearchResultsOrganism = ({ className = '' }: SearchResultsOrganismProps) => {
  const [filters, setFilters] = useState({
    location: '',
    maxPrice: undefined as number | undefined,
    minGuests: undefined as number | undefined,
  });

  console.log('SearchResultsOrganism: Current filters', filters);

  const { data, loading, error, refetch } = useQuery(SearchListings, {
    variables: {
      location: filters.location || undefined,
      maxPrice: filters.maxPrice,
      minGuests: filters.minGuests,
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  const handleFiltersChange = (newFilters: typeof filters) => {
    console.log('SearchResultsOrganism: Filters changed', newFilters);
    setFilters(newFilters);
  };

  const handleRetry = () => {
    console.log('SearchResultsOrganism: Retrying search');
    refetch();
  };

  if (error) {
    console.error('SearchResultsOrganism: GraphQL error', error);
  }

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Find Your Perfect Stay
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover amazing places to stay around the world
          </p>
        </div>

        {/* Search Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <SearchFilters
            onFiltersChange={handleFiltersChange}
            initialFilters={filters}
          />
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-gray-900">
                {loading ? 'Searching...' : `${data?.searchListings?.length || 0} properties found`}
              </h2>
              {filters.location && (
                <p className="text-gray-600">
                  in {filters.location}
                </p>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                Something went wrong while searching. Please try again.
                <button
                  onClick={handleRetry}
                  className="ml-2 underline hover:no-underline font-medium"
                >
                  Retry
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Grid */}
          {!loading && !error && (
            <ListingGrid listings={data?.searchListings || []} />
          )}

          {/* Empty State */}
          {!loading && !error && data?.searchListings?.length === 0 && (
            <div className="text-center py-16">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  No properties found
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Try adjusting your search filters or explore different locations to find the perfect place to stay.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};