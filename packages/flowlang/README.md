# @auto-engineer/flowlang

A TypeScript library for building domain-driven flows with event sourcing and CQRS patterns.

## Features

- **Flow Builder**: Create domain flows with commands, queries, and reactions
- **Slice Builder**: Organize flows into slices with integration support
- **Event/Command Builders**: Type-safe event and command creation
- **Testing Helpers**: Given-When-Then testing utilities
- **Integration Support**: Configure external service integrations
- **Fluent API**: Method chaining for better developer ergonomics

## Usage

```typescript
import { 
  commandSlice, 
  querySlice, 
  reactionSlice,
  flow, 
  createBuilders,
  should, 
  when 
} from '@auto-engineer/flowlang';

const { Events, Commands } = createBuilders()
  .events<PropertyListed | BookingRequested>()
  .commands<ListProperty | RequestBooking>();

export default flow('PropertyBooking', () => {
  commandSlice('List property')
    .client('A form that allows hosts to list a property', () => {
      specs(() => {
        should('have fields for title, description, location, address')
        should('have price per night input')
      });
    })
    .server('List property', () => {
      specs('Host can lists a new property', () => {
        when(Commands.ListProperty({...}))
          .then([Events.PropertyListed({...})])
      });
    })
    .validate();
});
```

## API

### Fluent API
- `commandSlice(name)` - Command slice builder with method chaining
- `querySlice(name)` - Query slice builder with method chaining
- `reactionSlice(name)` - Reaction slice builder with method chaining
- `createBuilders()` - Type-safe event/command/state builders
- `.validate()` - Validate and execute slice definitions

### Core Functions
- `flow(name, fn)` - Define a flow
- `client(name, fn)` - Client specifications
- `server(name, fn)` - Server implementations
- `specs(name, fn)` - Test specifications

### Builders
- `event` - Type-safe event builder
- `command` - Type-safe command builder
- `createIntegration(type, name)` - Create integration configurations

### Testing
- `given(events)` - Set up test state
- `when(command)` - Execute test command
- `then(expectedEvents)` - Assert expected outcomes

## Fluent API Benefits

- **Better IDE Support**: Autocomplete flows naturally from left to right
- **Reduced Nesting**: Flatter code is easier to read and refactor
- **Type Safety**: Invalid combinations are caught at compile time
- **Consistent Pattern**: Everything follows the same method chaining pattern
- **Optional Chaining**: Skip parts that aren't needed

See [FLUENT_API.md](./FLUENT_API.md) for detailed documentation and examples. 