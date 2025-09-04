# @auto-engineer/message-bus

A message bus plugin for the Auto Engineer CLI that implements a Command Query Responsibility Segregation (CQRS) pattern for handling commands and events in an event-driven architecture. It supports command handling, event publishing, and subscription with robust debugging capabilities.

## Installation

Install the package as a dependency in your Auto Engineer project:

```bash
npm install @auto-engineer/message-bus
```

## Configuration

Add the plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/message-bus',
    // ... other plugins
  ],
};
```

## What does this package do?

The `@auto-engineer/message-bus` plugin provides a lightweight, type-safe message bus for managing commands and events in the Auto Engineer ecosystem. It enables plugins to communicate through a CQRS pattern, where commands trigger actions and events notify subscribers of changes. It includes detailed debugging support and integrates seamlessly with other Auto Engineer plugins.

## Key Features

### CQRS Pattern

- **Commands**: Trigger actions with type-safe data payloads
- **Events**: Notify subscribers of state changes or actions
- **Handlers**: Define command and event handlers with type safety
- **Subscriptions**: Subscribe to specific events or all events

### Command Handling

- Register command handlers with `registerCommandHandler`
- Execute commands with `sendCommand`
- Supports async command handling with optional event emission
- Ensures one handler per command type

### Event Publishing and Subscription

- Publish events with `publishEvent`
- Subscribe to specific events with `subscribeToEvent`
- Subscribe to all events with `subscribeAll`
- Unsubscribe from events using subscription objects

### Debugging Support

- Uses the `debug` library for detailed logging
- Namespaces: `message-bus`, `message-bus:command`, `message-bus:event`, `message-bus:handler`
- Logs command execution, event publishing, and handler registration
- Configurable via `DEBUG` environment variable

## Usage

### Creating a Message Bus

```typescript
import { createMessageBus } from '@auto-engineer/message-bus';

const bus = createMessageBus();
```

### Registering a Command Handler

```typescript
import { defineCommandHandler } from '@auto-engineer/message-bus';

const createUserHandler = defineCommandHandler({
  name: 'CreateUser',
  alias: 'create-user',
  description: 'Creates a new user',
  category: 'User Management',
  fields: {
    name: { description: 'User name', required: true },
    email: { description: 'User email', required: true },
  },
  examples: ['create-user --name John --email john@example.com'],
  handle: async (command) => {
    console.log(`Creating user: ${command.data.name}`);
    return {
      type: 'UserCreated',
      data: { userId: '123', name: command.data.name, email: command.data.email },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  },
});

bus.registerCommandHandler(createUserHandler);
```

### Sending a Command

```typescript
await bus.sendCommand({
  type: 'CreateUser',
  data: { name: 'John', email: 'john@example.com' },
  requestId: 'req-123',
  correlationId: 'corr-456',
});
```

### Subscribing to Events

```typescript
const subscription = bus.subscribeToEvent('UserCreated', {
  name: 'UserCreatedHandler',
  handle: async (event) => {
    console.log(`User created: ${event.data.userId}`);
  },
});

// Unsubscribe when needed
subscription.unsubscribe();
```

### Subscribing to All Events

```typescript
const subscription = bus.subscribeAll({
  name: 'AllEventsHandler',
  handle: async (event) => {
    console.log(`Event received: ${event.type}`);
  },
});

// Unsubscribe when needed
subscription.unsubscribe();
```

### Debugging

Enable debug logging with the `DEBUG` environment variable:

```bash
DEBUG=message-bus:* npm run dev
```

Example output:

```
message-bus Creating new message bus instance
message-bus Message bus state initialized
message-bus:handler Registering command handler: CreateUser
message-bus:handler Handler registered successfully, total handlers: 1
message-bus:command Sending command: CreateUser
message-bus:command   Request ID: req-123
message-bus:command   Correlation ID: corr-456
message-bus:command   Data keys: [ 'name', 'email' ]
message-bus:command Handler found for command: CreateUser
message-bus:command Executing handler for: CreateUser
message-bus:event Publishing event: UserCreated
message-bus:event   Request ID: req-123
message-bus:event   Correlation ID: corr-456
message-bus:event   Timestamp: 2025-09-04T14:19:00.000Z
message-bus:event   Data keys: [ 'userId', 'name', 'email' ]
```

See [DEBUG.md](./DEBUG.md) for detailed debugging instructions.

## Project Structure

```
message-bus/
├── src/
│   ├── index.ts            # Exports and main entry point
│   ├── message-bus.ts      # Core message bus implementation
│   ├── define-command.ts   # Command handler definition utility
│   ├── types.ts            # Type definitions for CQRS
├── DEBUG.md                # Debugging instructions
├── CHANGELOG.md            # Version history
├── package.json
├── tsconfig.json
```

## Quality Assurance

- **Type Safety**: Full TypeScript support with strict type checking
- **Testing**: Unit tests using Vitest
- **Linting**: ESLint and Prettier for code quality
- **Error Handling**: Robust error handling for command and event processing
- **Debugging**: Detailed logging with `debug` library

## Integration with Auto Engineer Ecosystem

Works with other Auto Engineer plugins:

- **@auto-engineer/file-syncer**: Emits file change events
- **@auto-engineer/flow**: Publishes flow-related events
- **@auto-engineer/server-generator-apollo-emmett**: Triggers commands for server generation
- **@auto-engineer/frontend-generator-react-graphql**: Triggers commands for frontend generation
- **@auto-engineer/server-implementer**: Handles server implementation commands
- **@auto-engineer/frontend-implementer**: Handles frontend implementation commands

## Commands

This plugin integrates with the Auto Engineer CLI but does not expose direct CLI commands. It is used internally by other plugins for event-driven communication.

## Getting Started

1. Install the plugin (see Installation above)
2. Add it to your `auto.config.ts`
3. Use the message bus in your application or other plugins

Example:

```bash
# Install the plugin
npm install @auto-engineer/message-bus

# Run your Auto Engineer project
npm run start
```

## Advanced Features

### Type-Safe Command Handlers

- Use `defineCommandHandler` to create handlers with metadata (alias, description, fields)
- Supports command validation through field definitions
- Generates events or void responses

### Event-Driven Architecture

- Asynchronous event handling with `Promise.allSettled` for robust execution
- Supports multiple handlers per event type
- All-event subscription for global event monitoring

### Correlation and Request IDs

- Tracks `requestId` and `correlationId` for command/event traceability
- Useful for debugging and logging workflows

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.
