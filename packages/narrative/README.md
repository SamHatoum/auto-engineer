# @auto-engineer/flow

Domain-specific language for building event-driven applications with type-safe schemas and GraphQL API generation. Plugin for the Auto Engineer CLI that enables defining business flows, data transformations, and integrations using TypeScript-based syntax.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/flow
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/flow',
    // ... other plugins
  ],
};
```

## Commands

This plugin provides the following commands:

- `create:example` - Create an example project with Flow
- `export:schema` - Export flow schema to JSON

## What is Flow?

Flow is a declarative language for describing business processes, data flows, and system integrations. It combines:

- Type Safety: Full TypeScript integration with compile-time validation
- Event-Driven Architecture: Built on top of the Emmett event sourcing framework
- GraphQL Integration: Schema generation and resolver creation
- Message Bus Support: Support for inter-service communication
- Flow Orchestration: Define workflows with branching logic and error handling

## Key Features

### Fluent API Design

Define business flows using chainable API:

```typescript
import { flow } from '@auto-engineer/flow';

const orderFlow = flow('place-order')
  .input<PlaceOrderCommand>()
  .validate(command => /* validation logic */)
  .process(async (command, ctx) => {
    // Business logic here
    return { orderId: generateId(), status: 'confirmed' };
  })
  .emit<OrderPlaced>()
  .build();
```

### Schema Generation

Generate GraphQL schemas from flow definitions:

```typescript
// Flows are converted to GraphQL mutations and queries
// Input types become GraphQL input types
// Output events become GraphQL object types
```

### Integration Support

Support for external service integrations:

```typescript
const flow = flow('payment-processing')
  .integration('stripe', StripePaymentGateway)
  .integration('email', EmailService)
  .process(async (command, ctx) => {
    const payment = await ctx.integrations.stripe.charge(command.amount);
    await ctx.integrations.email.sendReceipt(command.email, payment);
    return payment;
  });
```

### Testing Support

Testing utilities for flow validation:

```typescript
import { testFlow } from '@auto-engineer/flow/testing';

describe('order flow', () => {
  it('should process valid orders', async () => {
    const result = await testFlow(orderFlow)
      .withInput({ productId: '123', quantity: 2 })
      .expectEvent<OrderPlaced>()
      .run();

    expect(result.orderId).toBeDefined();
  });
});
```

## Architecture

Flow builds on several core concepts:

- Flows: The main building blocks that define business processes
- Messages: Strongly-typed data structures for communication
- Integrations: External service connectors with retry and error handling
- Context: Runtime environment providing access to integrations and utilities
- Registry: Central repository for flow definitions and metadata

## Getting Started

1. Install the plugin (see Installation above)
2. Create your first flow project:
   ```bash
   auto create:example
   ```
3. Explore the generated example flows in the `flows/` directory
4. Define your own business flows using the Flow API
5. Export your schema for GraphQL integration:
   ```bash
   auto export:schema
   ```

## Integration with Auto Engineer

Flow works with other Auto Engineer plugins:

- **@auto-engineer/server-generator-apollo-emmett**: Generates server infrastructure from Flow schemas
- **@auto-engineer/frontend-generator-react-graphql**: Creates React components from flow-generated GraphQL schemas
- **@auto-engineer/server-implementer**: Implements flow handlers with AI assistance
- **@auto-engineer/information-architect**: Generates information architecture from flow definitions

This plugin-based approach allows building applications from high-level flow definitions to production code.
