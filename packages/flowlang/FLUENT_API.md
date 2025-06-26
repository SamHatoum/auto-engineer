# Fluent API for Flow Language

The Fluent API provides better developer ergonomics for the Flow Language DSL with method chaining and improved type safety.

## Key Benefits

### Better IDE Support
- Autocomplete flows naturally from left to right
- Each method returns a typed builder, making invalid chains impossible
- No need to remember which functions are available in which context

### Reduced Nesting
- Flatter code is easier to read and refactor
- Less cognitive load tracking closing braces
- Easier to reorder or extract sections

### Type-Safe Event/Command/State Builders
- Use `createBuilders()` for fully typed events, commands, and state
- Automatic TypeScript inference for event/command payloads
- IDE autocomplete for all event and command types

## Core API

### Flow Definition
```typescript
import { flow } from '@auto-engineer/flowlang';

flow('Flow name', () => {
  // Define your slices here
});
```

### Slice Builders

#### Command Slices
```typescript
commandSlice('Action name')
  .stream('stream-${id}')              // Optional: specify event stream
  .client(() => { /* or */ })          // Optional: client implementation
  .client('Description', () => { })    // Optional: with description
  .server(() => { /* or */ })          // Optional: server implementation
  .server('Description', () => { })    // Optional: with description
  .via(Integration)                    // Optional: single integration
  .via([Integration1, Integration2])   // Optional: multiple integrations
  .retries(3)                         // Optional: retry count
```

#### Query Slices
```typescript
querySlice('Query name')
  .client(() => { /* or */ })          // Optional: client implementation
  .client('Description', () => { })    // Optional: with description
  .request(gql`...`)                   // Optional: GraphQL query
  .server(() => { /* or */ })          // Optional: server implementation
  .server('Description', () => { })    // Optional: with description
```

#### Reaction Slices
```typescript
reactSlice('Reaction name')
  .server(() => { /* or */ })          // Required: server implementation
  .server('Description', () => { })    // Or with description
  .via(Integration)                    // Optional: integration
  .retries(3)                         // Optional: retry count
```

### Type-Safe Builders

Create strongly-typed event and command builders:

```typescript
import { createBuilders } from '@auto-engineer/flowlang';

// Define your event and command types
type PropertyListed = Event<'PropertyListed', { propertyId: string, ... }>;
type ListProperty = Command<'ListProperty', { propertyId: string, ... }>;
type AvailableProperty = { propertyId: string, title: string, ... };

// Create typed builders
const { Events, Commands, State } = createBuilders()
  .events<PropertyListed | BookingRequested>()
  .commands<ListProperty | RequestBooking>()
  .state<{ AvailableListings: AvailableProperty }>();

// Use with full type safety
Events.PropertyListed({ propertyId: "123", ... })
Commands.ListProperty({ propertyId: "123", ... })
State.AvailableListings({ propertyId: "123", title: "..." })
```

### Testing Utilities

Within specs blocks, use the testing helpers:

```typescript
import { specs, should, when } from '@auto-engineer/flowlang';

specs('Specification name', () => {
  // UI specifications
  should('have input field for email')
  should('display error on invalid input')
  should.not('allow submission without required fields')
  
  // Behavior specifications
  when(Commands.CreateListing({ ... }))
    .then([Events.ListingCreated({ ... })])
});
```

### GraphQL Integration

Use the `gql` template literal for GraphQL queries:

```typescript
import { gql } from '@auto-engineer/flowlang';

querySlice('Search listings')
  .request(gql`
    query SearchListings($location: String) {
      searchListings(location: $location) {
        propertyId
        title
      }
    }
  `)
```

## Complete Examples

### Command with Client and Server

```typescript
import { flow, commandSlice, specs, should, when, createBuilders } from '@auto-engineer/flowlang';

const { Events, Commands } = createBuilders()
  .events<ListingCreated>()
  .commands<CreateListing>()
  .state<{}>()

flow('Host manages listings', () => {
  commandSlice('Create listing')
    .stream('listing-${id}')
    .client('A form that allows hosts to create a listing', () => {
      specs(() => {
        should('have fields for title, description, location, address')
        should('have price per night input')
        should('have max guests selector')
        should('have amenities checklist')
      });
    })
    .server('Create listing handler', () => {
      specs('Host can create a new listing', () => {
        when(
          Commands.CreateListing({
            propertyId: "listing_123",
            hostId: "host_456",
            location: "San Francisco",
            title: "Modern Downtown Apartment",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen"]
          })
        ).then([
          Events.ListingCreated({
            propertyId: "listing_123",
            hostId: "host_456",
            location: "San Francisco",
            title: "Modern Downtown Apartment",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen"],
            listedAt: new Date()
          })
        ]);
      });
    });
});
```

### Query with GraphQL

```typescript
querySlice('Search for available listings')
  .client('Listing Search Screen', () => {
    specs(() => {
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
    }
  `)
  .server('Search projection', () => {
    specs('Listing becomes searchable', () => {
      when(Events.ListingCreated({ ... }))
        .then([State.AvailableListings({ ... })])
    });
  });
```

### Reaction with External Integration

```typescript
import { MailChimp, Twilio } from '@auto-engineer/integrations';

reactSlice('When booking request then notify host')
  .server('Send notification to host', () => {
    specs('Host is notified when booking request is received', () => {
      when([Events.BookingRequested({ ... })])
        .then([Commands.NotifyHost({ ... })])
    });
  });

commandSlice('Notify host')
  .via([MailChimp, Twilio])
  .retries(3)
  .server('Send notifications', () => {
    specs('Send notification using integrations', () => {
      when(Commands.NotifyHost({ ... }))
        .then([Events.HostNotified({ ... })])
    });
  });
```

## Integration Support

Define integrations using the type-safe integration pattern:

```typescript
import { createIntegration } from '@auto-engineer/flowlang';

export const MailChimp = createIntegration('email', 'MailChimp');
export const Twilio = createIntegration('sms', 'Twilio');
```

## Migration from Non-Fluent API

### Before (Function-based)
```typescript
flow('PropertyBooking', () => {
  slice
    .stream('property-${id}')
    .command('List property', () => {
      client('A form that allows hosts to list a property', () => {
        specs(() => {
          should('have fields for title, description')
        });
      });
      server('List property', () => {
        specs('Host can list a new property', () => {
          when(command({...}))
            .then([event({...})])
        });
      });
    });
});
```

### After (Fluent)
```typescript
flow('PropertyBooking', () => {
  commandSlice('List property')
    .stream('property-${id}')
    .client('A form that allows hosts to list a property', () => {
      specs(() => {
        should('have fields for title, description')
      });
    })
    .server('List property', () => {
      specs('Host can list a new property', () => {
        when(Commands.ListProperty({...}))
          .then([Events.PropertyListed({...})])
      });
    });
});
```

## Best Practices

1. **Use createBuilders() for type safety**: Always define your events, commands, and state types upfront
2. **Keep specs focused**: Each spec should test one specific behavior
3. **Use descriptive names**: Both for slices and specifications
4. **Group related flows**: Use the flow() wrapper to organize related slices
5. **Leverage optional chaining**: Only add the parts you need (client, server, integrations) 