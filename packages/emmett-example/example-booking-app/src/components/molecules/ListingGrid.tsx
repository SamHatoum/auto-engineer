import { ListingCard } from './ListingCard';
import { Skeleton } from '../atoms/skeleton';

export interface ListingGridProps {
  listings?: Array<{
    propertyId: string;
    title: string;
    location: string;
    pricePerNight: number;
    maxGuests: number;
  }>;
  loading?: boolean;
  error?: string;
}

export const ListingGrid = ({ listings = [], loading = false, error }: ListingGridProps) => {
  console.log('ListingGrid render:', { listingsCount: listings.length, loading, error });

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg text-destructive mb-2">Unable to load listings</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No listings found</h3>
          <p className="text-muted-foreground">Try adjusting your search filters to find more results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {listings.map((listing) => (
        <ListingCard
          key={listing.propertyId}
          propertyId={listing.propertyId}
          title={listing.title}
          location={listing.location}
          pricePerNight={listing.pricePerNight}
          maxGuests={listing.maxGuests}
        />
      ))}
    </div>
  );
};