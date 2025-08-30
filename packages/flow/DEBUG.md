# Debug Logging - Flow

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

### Core Flow Operations

- `flow:flow` - Flow creation and management
- `flow:context` - Flow context operations
- `flow:slice` - Slice operations
- `flow:registry` - Registry operations (flow, message, integration)

### Fluent Builder Operations

- `flow:fluent-builder` - General builder operations
- `flow:fluent-builder:command` - Command slice building
- `flow:fluent-builder:query` - Query slice building
- `flow:fluent-builder:react` - Reaction slice building

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all flow logging
DEBUG=flow:* pnpm dev

# Enable specific namespace
DEBUG=flow:flow pnpm dev

# Enable all builder operations
DEBUG=flow:fluent-builder:* pnpm dev

# Enable multiple specific namespaces
DEBUG=flow:flow,flow:context pnpm dev
```

## Examples

### Debug Flow Creation

```bash
DEBUG=flow:flow pnpm test
```

Output example:

```
flow:flow Creating new flow: ShoppingAssistant
flow:flow Flow created with 0 slices
flow:flow Registering flow: ShoppingAssistant
flow:flow Flow registered successfully
```

### Debug Slice Building

```bash
DEBUG=flow:fluent-builder:* pnpm dev
```

Output example:

```
flow:fluent-builder Creating command slice via factory: CreateOrder
flow:fluent-builder:command Creating command slice: CreateOrder
flow:fluent-builder:command Command slice added to flow: CreateOrder
flow:fluent-builder:command Adding client block to slice CreateOrder, description: "Order form"
flow:fluent-builder:command Starting client block execution
flow:fluent-builder:command Client block execution completed
flow:fluent-builder:command Setting request for slice CreateOrder
flow:fluent-builder:command Request is GraphQL AST Document, converting to SDL
flow:fluent-builder:command Converted SDL length: 245
```

### Debug Context Operations

```bash
DEBUG=flow:context pnpm dev
```

Output example:

```
flow:context Starting new flow: ShoppingAssistant
flow:context Current flow set: ShoppingAssistant
flow:context Adding slice to current flow: CreateOrder (type: command)
flow:context Slice added, total slices in flow: 1
flow:context Starting client block for slice: CreateOrder
flow:context   Description: Order form interface
flow:context Client block ended for slice: CreateOrder
```

### Debug Registry Operations

```bash
DEBUG=flow:registry pnpm dev
```

Output example:

```
flow:registry Registering flow: ShoppingAssistant
flow:registry Total registered flows: 1
flow:registry Registering message: CreateOrderCommand
flow:registry Message registered with schema: { name, items, total }
flow:registry Registering integration: ProductCatalog
flow:registry Integration registered successfully
```

## Common Use Cases

### Debugging Flow Export

```bash
DEBUG=flow:flow,flow:context pnpm export:schema
```

### Debugging Slice Processing

```bash
DEBUG=flow:slice,flow:fluent-builder:* pnpm build
```

### Full Flow Creation Trace

```bash
DEBUG=flow:* pnpm dev
```

## Tips

- Use wildcards to see related logs: `DEBUG=flow:fluent-builder:*`
- Combine with other packages: `DEBUG=flow:*,emmett:*`
- Filter by operation type: `DEBUG=*:command` (all command-related logs)
- Save to file: `DEBUG=flow:* pnpm dev 2> flow-debug.log`
