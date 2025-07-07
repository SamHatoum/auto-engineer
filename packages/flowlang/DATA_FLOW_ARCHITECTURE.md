# Data Flow Architecture

The flowlang DSL provides a unified, context-aware `data()` function that accepts arrays of data flow items within server blocks.

## Overview

The new architecture replaces the previous `.stream()`, `.via()`, and inline datasources with a single `data()` function that accepts arrays. The function automatically enforces type constraints based on the slice context:

- **Command slices**: Can only contain `DataSinkItem` objects (outbound data)
- **Query slices**: Can only contain `DataSourceItem` objects (inbound data)
- **React slices**: Can contain both `DataSinkItem` and `DataSourceItem` objects

The `data()` function is called within the `.server()` block since data flow is a server-side concern.

## Simple Array-Based API

### Command Slices

```typescript
import { commandSlice, sink, data } from '@auto-engineer/flowlang';

commandSlice('Create listing')
  .server(() => {
    data([
      // Event to stream
      sink().event('ListingCreated')
        .fields({ propertyId: true })
        .toStream('listing-${propertyId}'),
      
      // Command to integrations
      sink().command('NotifyHost')
        .toIntegration(MailChimp, Twilio),
      
      // State to database
      sink().state('ListingState')
        .toDatabase('listings')
    ]);
    
    // Your server logic here
    specs('...', () => {
      // ...
    });
  })
```

### Query Slices

```typescript
import { querySlice, source, data } from '@auto-engineer/flowlang';

querySlice('Search listings')
  .server(() => {
    data([
      // From projection
      source().state('AvailableListings')
        .fromProjection('ListingsProjection'),
      
      // From read model
      source().state('UserPreferences')
        .fromReadModel('UserPreferencesModel'),
      
      // From database with query
      source().state('RecentBookings')
        .fromDatabase('bookings', { 
          createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } 
        }),
      
      // From external API
      source().state('WeatherData')
        .fromApi('https://api.weather.com/current', 'GET')
    ]);
    
    // Your server logic here
    specs('...', () => {
      // ...
    });
  })
```

### React Slices

React slices can mix sinks and sources in the same array:

```typescript
import { reactSlice, sink, source, data } from '@auto-engineer/flowlang';

reactSlice('Process payment')
  .server(() => {
    data([
      // Read payment configuration
      source().state('PaymentConfig')
        .fromDatabase('config'),
      
      // Send command to payment system
      sink().command('ChargePayment')
        .toIntegration(StripeIntegration),
      
      // Emit event
      sink().event('PaymentProcessed')
        .toStream('payments-${orderId}')
    ]);
    
    specs('When order confirmed, charge payment', () => {
      when([
        Events.OrderConfirmed({ orderId: "123", amount: 100 })
      ]).then([
        Commands.ChargePayment({ orderId: "123", amount: 100 })
      ]);
    });
  })
```

## Type Safety

The `data()` function provides compile-time type safety through TypeScript's type system:

```typescript
// ✅ Command slice - only sinks allowed
commandSlice('Create listing')
  .server(() => {
    data([
      sink().event('ListingCreated').toStream('listing-${propertyId}')
    ]);
  })

// ❌ Command slice - sources not allowed
commandSlice('Create listing')
  .server(() => {
    data([
      source().state('Config').fromDatabase('config') // TypeScript error
    ]);
  })

// ✅ Query slice - only sources allowed
querySlice('Search listings')
  .server(() => {
    data([
      source().state('AvailableListings').fromProjection('ListingsProjection')
    ]);
  })

// ❌ Query slice - sinks not allowed
querySlice('Search listings')
  .server(() => {
    data([
      sink().event('DataQueried').toStream('queries') // TypeScript error
    ]);
  })

// ✅ React slice - can mix both
reactSlice('Handle event')
  .server(() => {
    data([
      source().state('Config').fromDatabase('config'),
      sink().command('HandleEvent').toIntegration(EventHandler),
      sink().event('EventHandled').toStream('events')
    ]);
  })
```

## Available Sinks (Command & React Slices)

1. **Stream**: Route to event streams with interpolation
   ```typescript
   sink().event('OrderPlaced')
     .fields({ customerId: true, orderId: true })
     .toStream('customer-${customerId}-order-${orderId}')
   ```

2. **Integration**: Send to external systems
   ```typescript
   sink().command('SendEmail')
     .toIntegration(SendGrid, MailChimp)
   ```

3. **Database**: Store in collections
   ```typescript
   sink().state('UserProfile')
     .toDatabase('user_profiles')
   ```

4. **Topic**: Publish to message queues
   ```typescript
   sink().event('PaymentProcessed')
     .toTopic('payment-events')
   ```

## Available Sources (Query & React Slices)

1. **Projection**: Read from event-sourced projections
   ```typescript
   source().state('OrderSummary')
     .fromProjection('OrderSummaryProjection')
   ```

2. **ReadModel**: Read from pre-computed read models
   ```typescript
   source().state('ProductCatalog')
     .fromReadModel('ProductCatalogModel')
   ```

3. **Database**: Query collections directly
   ```typescript
   source().state('UserAccounts')
     .fromDatabase('users', { active: true })
   ```

4. **API**: Fetch from external services
   ```typescript
   source().state('StockPrices')
     .fromApi('https://api.stocks.com/prices', 'POST')
   ```

## Field Selection

Both sinks and sources support field selection for fine-grained control:

```typescript
// Sink with nested field selection
sink().event('UserUpdated')
  .fields({
    userId: true,
    profile: {
      name: true,
      email: true,
      // preferences excluded
    }
  })
  .toStream('user-${userId}')

// Source with field selection
source().state('CustomerData')
  .fields({
    id: true,
    contact: {
      email: true,
      phone: true
    },
    // creditCard excluded for security
  })
  .fromDatabase('customers')
```

## Migration Guide

### From Object-Based `data()`
```typescript
// Before (object with properties)
commandSlice('Create listing')
  .server(() => {
    data({
      sinks: [
        sink().event('ListingCreated').toStream('listing-${propertyId}')
      ]
    });
  })

// After (direct array)
commandSlice('Create listing')
  .server(() => {
    data([
      sink().event('ListingCreated').toStream('listing-${propertyId}')
    ]);
  })
```

### From `.stream()` and `.via()`
```typescript
// Before
commandSlice('Create listing')
  .stream('listing-${id}')
  .via([MailChimp, Twilio])
  .server(() => {
    // ...
  })

// After
commandSlice('Create listing')
  .server(() => {
    data([
      sink().event('ListingCreated')
        .fields({ propertyId: true })
        .toStream('listing-${propertyId}'),
      sink().command('NotifyHost')
        .toIntegration(MailChimp, Twilio)
    ]);
    // ...
  })
```

## Benefits

1. **Simple API**: Direct array syntax is more intuitive
2. **Type Safety**: Context-aware types prevent invalid configurations
3. **Natural Mixing**: React slices can naturally mix sources and sinks
4. **Less Nesting**: Flatter structure is easier to read and write
5. **Familiar Pattern**: Arrays of operations are a common programming pattern

## Using Typed Builders (NEW!)

The flowlang DSL now supports using typed builders directly with the `sink()` and `source()` functions:

### Setup

```typescript
import { createBuilders } from '@auto-engineer/flowlang';

// Define your event/command/state types
type ListingCreated = { type: 'ListingCreated'; data: { propertyId: string; /* ... */ } };
type CreateListing = { type: 'CreateListing'; data: { propertyId: string; /* ... */ } };
type AvailableListings = { propertyId: string; title: string; /* ... */ };

// Create typed builders
const { Events, Commands, State, sink, source } = createBuilders()
  .events<ListingCreated>()
  .commands<CreateListing>()
  .state<{ AvailableListings: AvailableListings }>();
```

### Using Typed Sinks

```typescript
commandSlice('Create listing')
  .server(() => {
    data([
      // Use typed event builder
      sink(Events.ListingCreated({
        propertyId: "listing_123",
        hostId: "host_456",
        // ... other fields with full type safety
      }))
        .fields({ propertyId: true })
        .toStream('listing-${propertyId}')
    ]);
  })
```

### Using Typed Sources

```typescript
querySlice('Search listings')
  .server(() => {
    data([
      // Use typed state builder
      source(State.AvailableListings({
        propertyId: "",
        title: "",
        // ... placeholder values (they won't be used)
      }))
        .fromProjection('AvailablePropertiesProjection')
    ]);
  })
```

### Benefits of Typed Builders

1. **Type Safety**: Full IntelliSense and compile-time checking
2. **No Magic Strings**: Message types come from your typed builders
3. **Refactoring Support**: Rename types and have changes propagate automatically
4. **Better DX**: IDE autocomplete for all message properties

### Current Limitations

Due to TypeScript's type system limitations with union types, some advanced scenarios may require type assertions. The team is working on improvements to make the type inference even smoother. 