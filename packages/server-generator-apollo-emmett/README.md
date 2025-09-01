# @auto-engineer/server-generator-apollo-emmett

Code generation plugin for the Auto Engineer CLI that scaffolds event-driven servers using the Emmett event sourcing framework. This plugin takes Flow specifications and generates GraphQL servers with commands, events, projections, and queries.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/server-generator-apollo-emmett
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/server-generator-apollo-emmett',
    // ... other plugins
  ],
};
```

## Commands

This plugin provides the following commands:

- `generate:server` - Generate a GraphQL server from flow specifications

## What does this plugin do?

The Emmett Generator transforms high-level flow specifications into event-driven servers. It generates:

### Command Handlers

- Command validation and business logic stubs
- Event emission patterns
- Error handling and domain validation
- Integration with the Emmett command bus

### Event Sourcing Infrastructure

- Event store configuration
- Event versioning and migration support
- Projection builders for read models
- Event stream processing

### GraphQL API Layer

- Type-safe GraphQL schema generation
- Mutation resolvers for commands
- Query resolvers for projections
- Subscription support for real-time updates

### Testing Infrastructure

- Comprehensive test suites for all generated components
- Behavioral tests for command handlers
- Integration tests for the GraphQL API
- Test data factories and fixtures

## Generated Project Structure

When you run `auto generate:server`, the plugin creates a complete server project:

```
server/
├── src/
│   ├── domain/
│   │   ├── commands/           # Command handlers
│   │   ├── events/            # Event definitions
│   │   ├── projections/       # Read model projections
│   │   └── queries/           # Query handlers
│   ├── graphql/
│   │   ├── resolvers/         # GraphQL resolvers
│   │   └── schema.ts          # Generated schema
│   ├── infrastructure/
│   │   ├── eventStore.ts      # Event store setup
│   │   └── commandBus.ts      # Command bus configuration
│   └── server.ts              # Application entry point
├── tests/                     # Generated test suites
└── package.json
```

## Features

### Type-Safe Code Generation

All generated code is fully typed using TypeScript, ensuring compile-time safety and developer experience.

### Event-Driven Architecture

Built on Emmett's event sourcing patterns:

- Commands represent intent to change state
- Events capture what actually happened
- Projections create read models from events
- Queries serve data to GraphQL clients

### Infrastructure

Generated servers include:

- Error handling and logging
- Health checks and monitoring endpoints
- Environment-based configuration
- Database migration scripts

### Templates

Uses EJS templating system for code generation:

- Command handler templates
- Event definition templates
- GraphQL resolver templates
- Test suite templates

## Integration with Flow

This plugin is designed to work with `@auto-engineer/flow` specifications:

1. Define your business flows using the Flow DSL
2. Export the flow schema using `auto export:schema`
3. Generate the server using `auto generate:server`
4. The generator reads the schema and creates appropriate handlers

## Example Workflow

```bash
# 1. Create a flow specification project
auto create:example

# 2. Define your business flows in flows/
# Edit flows/order-management.flow.ts

# 3. Generate the server server
auto generate:server

# 4. The generated server is ready to run:
cd server
npm install
npm run start
```

## Advanced Features

### Custom Templates

Override default templates by providing your own EJS files:

- Place custom templates in `.auto-engineer/templates/`
- Templates follow the same structure as built-in ones
- Supports partial overrides for specific components

### Plugin Integration

Works with other Auto Engineer plugins:

- **@auto-engineer/server-implementer**: AI-powered implementation of generated stubs
- **@auto-engineer/server-checks**: Validation of generated code
- **@auto-engineer/frontend-generator-react-graphql**: Frontend generation from server schema

### Configuration Options

Customize generation behavior through `auto.config.ts`:

```typescript
export default {
  plugins: [
    [
      '@auto-engineer/server-generator-apollo-emmett',
      {
        outputDir: './server',
        templateOverrides: './templates',
        generateMigrations: true,
      },
    ],
  ],
};
```

The Emmett Generator bridges the gap between high-level business requirements and server infrastructure, enabling development of scalable, maintainable applications.
