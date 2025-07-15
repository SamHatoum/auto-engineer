import {
  commandSlice,
  querySlice,
  reactSlice,
  flow,
  createBuilders,
  should,
  when,
  specs,
  gql,
  sink,
  source,
  data,
} from '@auto-engineer/flowlang';

import type { ListingCreated } from '../../emmett-graphql-backend/src/domain/flows/host-manages-listings/create-listing';
import type { BookingRequested } from '../../emmett-graphql-backend/src/domain/flows/guest-books-a-place/guest-submits-booking-request/events';
import type { ListingRemoved } from '../../emmett-graphql-backend/src/domain/flows/host-manages-listings/remove-listing/events';
import type { CreateListing } from '../../emmett-graphql-backend/src/domain/flows/host-manages-listings/create-listing/commands';
import type { RequestBooking } from '../../emmett-graphql-backend/src/domain/flows/guest-books-a-place/guest-submits-booking-request/commands';
import type { NotifyHost } from '../../emmett-graphql-backend/src/domain/flows/guest-books-a-place/notify-host/commands';
import type { RemoveListing } from '../../emmett-graphql-backend/src/domain/flows/host-manages-listings/remove-listing/commands';

import { AvailablePlace } from '../../emmett-graphql-backend/src/domain/flows/guest-books-a-place/search-for-available-places/state';
import { HostNotified } from '../../emmett-graphql-backend/src/domain/flows/guest-books-a-place/notify-host/events';
import { MailChimp } from '@auto-engineer/mailchimp-integration';
import { Twilio } from '@auto-engineer/twilio-integration';

const { Events, Commands, State } = createBuilders()
  .events<ListingCreated | BookingRequested | HostNotified | ListingRemoved>()
  .commands<CreateListing | RequestBooking | NotifyHost | RemoveListing>()
  .state<{ AvailablePlaces: AvailablePlace }>();

flow('Host manages listings', () => {
  commandSlice('Create listing')
    .client(() => {
      specs('A form that allows hosts to create a listing', () => {
        should('have fields for title, description, location, address');
        should('have price per night input');
        should('have max guests selector');
        should('have amenities checklist');
      });
    })
    .server(() => {
      data([sink().event('ListingCreated').fields({ listingId: true }).toStream('listing-${listingId}')]);

      specs('Host can create a new listing', () => {
        when(
          Commands.CreateListing({
            listingId: 'listing_123',
            hostId: 'host_456',
            location: 'San Francisco',
            address: '123 Market St',
            title: 'Modern Downtown Apartment',
            description: 'Beautiful apartment with city views',
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ['wifi', 'kitchen', 'parking'],
          }),
        ).then([
          Events.ListingCreated({
            listingId: 'listing_123',
            hostId: 'host_456',
            location: 'San Francisco',
            address: '123 Market St',
            title: 'Modern Downtown Apartment',
            description: 'Beautiful apartment with city views',
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ['wifi', 'kitchen', 'parking'],
            listedAt: new Date('2024-01-15T10:00:00Z'),
          }),
        ]);
      });
    });

  commandSlice('Remove listing').server(() => {
    data([sink().event('ListingRemoved').fields({ listingId: true }).toStream('listing-${listingId}')]);

    specs('Host can remove an existing listing', () => {
      when(
        Commands.RemoveListing({
          listingId: 'listing_123',
          hostId: 'host_456',
        }),
      ).then([
        Events.ListingRemoved({
          listingId: 'listing_123',
          hostId: 'host_456',
          removedAt: new Date('2024-01-16T10:00:00Z'),
        }),
      ]);
    });
  });
});

flow('Guest books a place', () => {
  querySlice('Search for available places')
    .client(() => {
      specs('Place Search Screen', () => {
        should('have location filter');
        should('have price range slider');
        should('have guest count filter');
      });
    })
    .request(gql`
      query SearchPlaces($location: String, $maxPrice: Float, $minGuests: Int) {
        searchPlaces(location: $location, maxPrice: $maxPrice, minGuests: $minGuests) {
          placeId
          title
          location
          pricePerNight
          maxGuests
        }
      }
    `)
    .server(() => {
      data([
        // @ts-expect-error: Allow passing builder function for type-safe state reference
        source().state(State.AvailablePlaces).fromProjection('AvailablePlacesProjection'),
      ]);

      specs('Place becomes searchable after listing is created', () => {
        when(
          Events.ListingCreated({
            listingId: 'listing_123',
            hostId: 'host_456',
            location: 'San Francisco',
            address: '123 Market St',
            title: 'Modern Downtown Apartment',
            description: 'Beautiful apartment with city views',
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ['wifi', 'kitchen', 'parking'],
            listedAt: new Date('2024-01-15T10:00:00Z'),
          }),
        ).then([
          State.AvailablePlaces({
            placeId: 'listing_123',
            title: 'Modern Downtown Apartment',
            location: 'San Francisco',
            pricePerNight: 250,
            maxGuests: 4,
          }),
        ]);
      });
    });

  querySlice('View a place')
    .request(gql`
      query ViewPlace($placeId: String!) {
        viewPlace(placeId: $placeId) {
          placeId
          title
          location
          address
          description
          pricePerNight
          maxGuests
          amenities
          hostId
        }
      }
    `)
    .server(() => {
      specs('Place details can be viewed after listing is created', () => {
        when(
          Events.ListingCreated({
            listingId: 'listing_123',
            hostId: 'host_456',
            location: 'San Francisco',
            address: '123 Market St',
            title: 'Modern Downtown Apartment',
            description: 'Beautiful apartment with city views',
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ['wifi', 'kitchen', 'parking'],
            listedAt: new Date('2024-01-15T10:00:00Z'),
          }),
        ).then([
          // View listing state should be available
        ]);
      });
    });

  reactSlice('Host is notified').server(() => {
    specs('Host is notified when booking request is received', () => {
      when([
        Events.BookingRequested({
          bookingId: 'booking_456',
          listingId: 'listing_123',
          hostId: 'host_456',
          guestId: 'guest_789',
          checkIn: '2024-02-01',
          checkOut: '2024-02-05',
          guests: 2,
          message: 'Looking forward to our stay!',
          status: 'pending_host_approval',
          requestedAt: '2024-01-15T14:30:00Z',
          expiresAt: '2024-01-16T14:30:00Z',
        }),
      ]).then([
        Commands.NotifyHost({
          hostId: 'host_456',
          bookingId: 'booking_456',
          notificationType: 'booking_request',
          priority: 'high',
          channels: ['email', 'sms'],
          message: 'Looking forward to our stay!',
          actionRequired: true,
        }),
      ]);
    });
  });

  commandSlice('Notify host').server(() => {
    data([
      // @ts-expect-error: Allow passing builder function for type-safe command reference
      sink().command(Commands.NotifyHost).toIntegration(MailChimp, Twilio),
    ]);

    specs('Send notification using the specified integrations', () => {
      when(
        Commands.NotifyHost({
          hostId: 'host_456',
          bookingId: 'booking_456',
          notificationType: 'booking_request',
          priority: 'high',
          channels: ['email', 'sms'],
          message: 'Looking forward to our stay!',
          actionRequired: true,
        }),
      ).then([
        Events.HostNotified({
          bookingId: 'booking_456',
          hostId: 'host_456',
          notificationType: 'booking_request',
          channels: ['email', 'sms'],
          notifiedAt: new Date('2024-01-15T14:30:00Z'),
        }),
      ]);
    });
  });
});
