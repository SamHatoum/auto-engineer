import { commandSlice, querySlice, reactSlice, flow, createBuilders, should, when, specs, gql } from '@auto-engineer/flow-lang';

import type { ListingCreated } from './slices/create-listing/events';
import type { BookingRequested } from './slices/guest-submits-booking-request/events';
import type { HostNotified } from './slices/host-manages-booking-request/events';
import type { PropertyRemoved } from './slices/remove-property/events';
import type { CreateListing } from './slices/create-listing/commands';
import type { RequestBooking } from './slices/guest-submits-booking-request/commands';
import type { NotifyHost } from './slices/host-manages-booking-request/commands';
import type { RemoveProperty } from './slices/remove-property/commands';
import type { AvailableProperty } from './shared/read-model';

import { MailChimp } from '@auto-engineer/mailchimp-integration';
import { Twilio } from '@auto-engineer/twilio-integration';

const { Events, Commands, State } = createBuilders()
  .events<ListingCreated | BookingRequested | HostNotified | PropertyRemoved>()
  .commands<CreateListing | RequestBooking | NotifyHost | RemoveProperty>()
  .state<{ AvailableProperties: AvailableProperty }>();


flow('Host creates a listing', () => {

  commandSlice('Create listing')
    .stream('listing-${id}')
    .client(() => {
      specs('A form that allows hosts to create a listing',() => {
        should('have fields for title, description, location, address')
        should('have price per night input')
        should('have max guests selector')
        should('have amenities checklist')
        should.not('be shown to guest users')
      });
    })
    .server(() => {
      specs('Host can create a new listing', () => {
        when(
          Commands.CreateListing({
            propertyId: "listing_123",
            hostId: "host_456",
            location: "San Francisco",
            address: "123 Market St",
            title: "Modern Downtown Apartment",
            description: "Beautiful apartment with city views",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen", "parking"]
          })).then([
            Events.ListingCreated({
              propertyId: "listing_123",
              hostId: "host_456",
              location: "San Francisco",
              address: "123 Market St",
              title: "Modern Downtown Apartment",
              description: "Beautiful apartment with city views",
              pricePerNight: 250,
              maxGuests: 4,
              amenities: ["wifi", "kitchen", "parking"],
              listedAt: new Date("2024-01-15T10:00:00Z")
            })
          ]);
      });
    });

});

flow('Guest books a listing', () => {

  querySlice('Search for available listings')
    .client(() => {
      specs('Listing Search Screen', () => {
        should('have location filter')
        should('have price range slider')
        should('have guest count filter')
      });
    })
    .request(gql`
      query SearchListings($location: String, $maxPrice: Float, $minGuests: Int) {
        searchListings(location: $location, maxPrice: $maxPrice, minGuests: $minGuests) {
          propertyId
          title
          location
          pricePerNight
          maxGuests
        }
      }`
    )
    .server(() => {
      specs('Listing becomes searchable after being created', () => {
        when(
          Events.ListingCreated({
            propertyId: "listing_123",
            hostId: "host_456",
            location: "San Francisco",
            address: "123 Market St",
            title: "Modern Downtown Apartment",
            description: "Beautiful apartment with city views",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen", "parking"],
            listedAt: new Date("2024-01-15T10:00:00Z")
          })
        ).then([
          State.AvailableProperties({
            propertyId: "listing_123",
            title: "Modern Downtown Apartment",
            location: "San Francisco",
            pricePerNight: 250,
            maxGuests: 4
          })
        ]);
      });
    });

  reactSlice('Host is notified')
    .server(() => {
      specs('Host is notified when booking request is received',() => {
        when([
          Events.BookingRequested({
            bookingId: "booking_456",
            propertyId: "listing_123",
            hostId: "host_456",
            guestId: "guest_789",
            checkIn: "2024-02-01",
            checkOut: "2024-02-05",
            guests: 2,
            message: "Looking forward to our stay!",
            status: "pending_host_approval",
            requestedAt: "2024-01-15T14:30:00Z",
            expiresAt: "2024-01-16T14:30:00Z"
          })
        ]).then([
          Commands.NotifyHost({
            hostId: "host_456",
            notificationType: "booking_request",
            priority: "high",
            channels: ["email", "sms"],
            message: "Looking forward to our stay!",
            actionRequired: true
          })
        ]);
      });
    });

  commandSlice('Notify host')
    .via([MailChimp, Twilio])
    .retries(3)
    .server(() => {
      specs('Send notification using the specified integrations', () => {
        when(
          Commands.NotifyHost({
            hostId: "host_456",
            notificationType: "booking_request",
            priority: "high",
            channels: ["email", "sms"],
            message: "Looking forward to our stay!",
            actionRequired: true
          })).then([
            Events.HostNotified({
              bookingId: "booking_456",
              hostId: "host_456",
              notificationType: "booking_request",
              channels: ["email", "sms"],
              notifiedAt: "2024-01-15T14:30:00Z"
            })
          ]);
      });
    });
});

