# @auto-engineer/message-bus

A lightweight message bus implementation for handling commands, events, and queries in a CQRS/Event-driven architecture.

## Installation

```bash
npm install @auto-engineer/message-bus
```

## Usage

```typescript
import { createMessageBus, CommandHandler, EventHandler, QueryHandler } from '@auto-engineer/message-bus';

// Create a message bus instance
const messageBus = createMessageBus();

// Register a command handler
const createUserHandler: CommandHandler = {
  name: 'CreateUser',
  handle: async (command) => {
    // Process the command
    return {
      status: 'ack',
      message: 'User created successfully',
      timestamp: new Date(),
    };
  },
};
messageBus.registerCommandHandler(createUserHandler);

// Send a command
const result = await messageBus.sendCommand({
  type: 'CreateUser',
  timestamp: new Date(),
  // ... other command data
});

// Similar patterns for events and queries
```

## API

### MessageBus

- `registerCommandHandler(handler: CommandHandler)`: Register a command handler
- `registerEventHandler(eventName: string, handler: EventHandler)`: Register an event handler
- `registerQueryHandler(handler: QueryHandler)`: Register a query handler
- `sendCommand(command: BaseCommand)`: Send a command and get an ack/nack response
- `publishEvent(event: BaseEvent)`: Publish an event and get an ack/nack response
- `executeQuery(query: BaseQuery)`: Execute a query and get the result
