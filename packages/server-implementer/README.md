# @auto-engineer/server-implementer

AI-powered implementation plugin for the Auto Engineer CLI that implements server-side code with AI assistance. This plugin takes generated code stubs and business requirements to create implementations.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/server-implementer
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/server-implementer',
    // ... other plugins
  ],
};
```

## Commands

This plugin provides the following commands:

- `implement:server` - Implement server-side code with AI assistance
- `implement:slice` - Implement a specific server slice with AI assistance

## What does this plugin do?

The Server Implementer uses AI capabilities to implement business logic, database operations, and integration code for server services. It bridges the gap between generated code scaffolds and functional implementations.

## Key Features

### AI Code Generation

- Analyzes existing code structure and patterns
- Understands business requirements from comments and specifications
- Generates appropriate implementations
- Maintains consistency with existing codebase patterns

### Incremental Implementation

- Implements one slice or component at a time
- Preserves existing implementations
- Allows for iterative refinement
- Supports partial implementations and manual overrides

### Test-Driven Development

- Generates implementations that pass existing tests
- Creates test cases for edge cases
- Validates implementations against test suites
- Supports behavior-driven development patterns

### Integration Awareness

- Understands dependencies between components
- Implements integration patterns correctly
- Handles error scenarios and edge cases
- Maintains data consistency across operations

## Workflow

### 1. Full Server Implementation

Use `implement:server` to implement an entire server project:

```bash
auto implement:server
```

This command:

- Scans the entire server project
- Identifies unimplemented stubs and TODOs
- Implements business logic based on specifications
- Ensures all components work together coherently

### 2. Slice-by-Slice Implementation

Use `implement:slice` for targeted implementation of specific features:

```bash
auto implement:slice --slice="order-management"
```

This approach:

- Focuses on a single business domain
- Implements related commands, events, and queries
- Maintains isolation between different slices
- Allows for parallel development of features

## Implementation Patterns

### Command Handler Implementation

The plugin understands common command handler patterns:

```typescript
// Before (generated stub)
export class PlaceOrderCommandHandler {
  async handle(command: PlaceOrderCommand): Promise<OrderPlaced[]> {
    // TODO: Implement order placement logic
    throw new Error('Not implemented');
  }
}

// After (AI implementation)
export class PlaceOrderCommandHandler {
  async handle(command: PlaceOrderCommand): Promise<OrderPlaced[]> {
    // Validate inventory availability
    const inventory = await this.inventoryService.checkAvailability(command.items);
    if (!inventory.available) {
      throw new InsufficientInventoryError(command.items);
    }

    // Calculate pricing
    const pricing = await this.pricingService.calculateTotal(command.items);

    // Create order aggregate
    const order = new Order({
      customerId: command.customerId,
      items: command.items,
      total: pricing.total,
    });

    // Emit order placed event
    return [
      new OrderPlaced({
        orderId: order.id,
        customerId: command.customerId,
        total: pricing.total,
        timestamp: new Date(),
      }),
    ];
  }
}
```

### Query Implementation

Implements read-side query handlers:

```typescript
// Implements projection queries with proper filtering, sorting, and pagination
export class OrderQueryHandler {
  async getOrderHistory(customerId: string, options: QueryOptions) {
    return await this.orderProjection
      .query()
      .where('customerId', customerId)
      .orderBy('createdAt', 'desc')
      .limit(options.limit)
      .offset(options.offset)
      .execute();
  }
}
```

### Integration Implementation

Handles external service integrations:

```typescript
// Implements integration patterns with proper error handling
export class PaymentIntegration {
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    try {
      const result = await this.stripeClient.charges.create({
        amount: paymentRequest.amount * 100, // Convert to cents
        currency: 'usd',
        source: paymentRequest.token,
        description: paymentRequest.description,
      });

      return {
        success: true,
        transactionId: result.id,
        amount: result.amount / 100,
      };
    } catch (error) {
      if (error.type === 'StripeCardError') {
        throw new PaymentDeclinedError(error.message);
      }
      throw new PaymentProcessingError('Payment failed', error);
    }
  }
}
```

## Configuration Options

Customize implementation behavior through environment variables or config:

```typescript
// auto.config.ts
export default {
  plugins: [
    [
      '@auto-engineer/server-implementer',
      {
        // AI model configuration
        model: 'claude-3-sonnet',
        temperature: 0.1,

        // Implementation preferences
        includeLogging: true,
        includeMetrics: true,
        errorHandlingPattern: 'domain-exceptions',

        // Test generation
        generateTests: true,
        testFramework: 'vitest',
      },
    ],
  ],
};
```

## Integration with Other Plugins

Works with the Auto Engineer ecosystem:

- **@auto-engineer/server-generator-apollo-emmett**: Implements generated command handlers and queries
- **@auto-engineer/server-checks**: Validates implementations pass type checking and tests
- **@auto-engineer/flow**: Uses flow specifications to understand business requirements
- **@auto-engineer/ai-gateway**: Leverages AI models for intelligent code generation

## Quality Assurance

The plugin ensures quality implementations through:

- Static Analysis: Validates TypeScript compliance and best practices
- Test Execution: Runs existing tests to ensure implementations work
- Code Review: Uses AI to review generated code for potential issues
- Pattern Consistency: Maintains consistency with existing codebase patterns
- Documentation: Generates inline documentation for complex logic

## Advanced Features

### Context-Aware Implementation

The AI understands:

- Existing project patterns and conventions
- Database schema and relationships
- External API contracts and integration patterns
- Error handling strategies used in the project
- Testing approaches and mocking patterns

### Iterative Refinement

- Analyzes test failures and refines implementations
- Learns from manual corrections and adjustments
- Adapts to project-specific requirements and constraints
- Supports incremental improvement over time

The Server Implementer transforms code scaffolds into implementations, accelerating server development while maintaining code quality and consistency.
