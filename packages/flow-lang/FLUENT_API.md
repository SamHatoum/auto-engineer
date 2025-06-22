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

### Consistent Pattern
Everything follows the same pattern:
```typescript
commandSlice('Action name')
  .client('Client description', () => {
    specs(() => {...})
  })
  .server('Server description', () => {
    specs('Server behavior', () => {...})
  })
  .validate();
```

### Optional Chaining
Skip parts that aren't needed:
```typescript
commandSlice('Internal cleanup')
  .server('Cleanup old data', () => {
    specs(() => {...})
  })
  .validate();
// No client needed? Just don't add it
```

## Usage Examples

### Commands
```typescript
commandSlice('List property')
  .stream('property-${id}')
  .client('A form that allows hosts to list a property', () => {
    specs(() => {
      should('have fields for title, description, location, address')
      should('have price per night input')
      should('have max guests selector')
      should('have amenities checklist')
      should.not('show for guest users')
    });
  })
  .server('List property', () => {
    specs('Host can lists a new property', () => {
      when(Commands.ListProperty({...}))
        .then([Events.PropertyListed({...})])
    });
  })
  .validate();
```

### Queries
```typescript
querySlice('Search for available properties')
  .client('Property Search', () => {
    specs(() => {
      should('have location filter')
      should('have price range slider')
      should('have guest count filter')
    });
  })
  .request(gql`...`)
  .server('Property search projection', () => {
    specs('Property becomes available', () => {...})
  })
  .validate();
```

### Reactions
```typescript
reactionSlice('When booking request then notify host')
  .server('Notify host of booking request', () => {
    specs('Host is notified', () => {...})
  })
  .validate();
```

### With Integrations and Retries
```typescript
commandSlice('Notify host')
  .via(MailChimp)
  .retries(3)
  .server('Notify host', () => {
    specs('Host is notified', () => {...})
  })
  .validate();
```

## Composition Patterns

### Reusable Builders
```typescript
const withStandardAuth = (builder) => 
  builder
    .client('Auth required', () => {
      specs(() => should('require authentication'))
    });

commandSlice('Delete property')
  .apply(withStandardAuth)
  .server('Delete', () => {
    specs(() => {...})
  })
  .validate();
```

## Validation

The `.validate()` method ensures:
- Commands have server implementations
- Queries have at least client or server implementations
- Reactions have server implementations
- All specs are executed

## Migration from Legacy API

### Before (Legacy)
```typescript
slice
  .stream('property-${id}')
  .command('List property', () => {
    client('A form that allows hosts to list a property', () => {
      specs(() => {
        should('have fields for title, description, location, address')
      });
    });
    server('List property', () => {
      specs('Host can lists a new property', () => {
        when(Commands.ListProperty({...}))
          .then([Events.PropertyListed({...})])
      });
    });
  });
```

### After (Fluent)
```typescript
commandSlice('List property')
  .stream('property-${id}')
  .client('A form that allows hosts to list a property', () => {
    specs(() => {
      should('have fields for title, description, location, address')
    });
  })
  .server('List property', () => {
    specs('Host can lists a new property', () => {
      when(Commands.ListProperty({...}))
        .then([Events.PropertyListed({...})])
    });
  })
  .validate();
```

## Type Safety

The fluent API provides full TypeScript support:
- Method chaining is type-safe
- Invalid combinations are caught at compile time
- Autocomplete shows only valid next steps
- Return types are properly inferred

## Error Handling

The API provides helpful error messages:
```typescript
commandSlice('Missing server')
  .client('Form', () => {
    specs(() => {...})
  })
  .validate(); // Throws: "Command 'Missing server' requires server implementation"
``` 