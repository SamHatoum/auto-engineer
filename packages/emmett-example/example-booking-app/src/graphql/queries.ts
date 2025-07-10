import { graphql } from '../gql';

export const SearchListings = graphql(`
	query SearchListings($location: String, $maxPrice: Float, $minGuests: Int) {
	  searchListings(location: $location, maxPrice: $maxPrice, minGuests: $minGuests) {
	    propertyId
	    title
	    location
	    pricePerNight
	    maxGuests
	  }
	}
`);