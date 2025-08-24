# Debug Logging - FlowLang

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

### Core Flow Operations

- `flowlang:flow` - Flow creation and management
- `flowlang:context` - Flow context operations
- `flowlang:slice` - Slice operations
- `flowlang:registry` - Registry operations (flow, message, integration)

### Fluent Builder Operations

- `flowlang:fluent-builder` - General builder operations
- `flowlang:fluent-builder:command` - Command slice building
- `flowlang:fluent-builder:query` - Query slice building
- `flowlang:fluent-builder:react` - Reaction slice building

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all flowlang logging
DEBUG=flowlang:* pnpm dev

# Enable specific namespace
DEBUG=flowlang:flow pnpm dev

# Enable all builder operations
DEBUG=flowlang:fluent-builder:* pnpm dev

# Enable multiple specific namespaces
DEBUG=flowlang:flow,flowlang:context pnpm dev
```

## Examples

### Debug Flow Creation

```bash
DEBUG=flowlang:flow pnpm test
```

Output example:

```
flowlang:flow Creating new flow: ShoppingAssistant
flowlang:flow Flow created with 0 slices
flowlang:flow Registering flow: ShoppingAssistant
flowlang:flow Flow registered successfully
```

### Debug Slice Building

```bash
DEBUG=flowlang:fluent-builder:* pnpm dev
```

Output example:

```
flowlang:fluent-builder Creating command slice via factory: CreateOrder
flowlang:fluent-builder:command Creating command slice: CreateOrder
flowlang:fluent-builder:command Command slice added to flow: CreateOrder
flowlang:fluent-builder:command Adding client block to slice CreateOrder, description: "Order form"
flowlang:fluent-builder:command Starting client block execution
flowlang:fluent-builder:command Client block execution completed
flowlang:fluent-builder:command Setting request for slice CreateOrder
flowlang:fluent-builder:command Request is GraphQL AST Document, converting to SDL
flowlang:fluent-builder:command Converted SDL length: 245
```

### Debug Context Operations

```bash
DEBUG=flowlang:context pnpm dev
```

Output example:

```
flowlang:context Starting new flow: ShoppingAssistant
flowlang:context Current flow set: ShoppingAssistant
flowlang:context Adding slice to current flow: CreateOrder (type: command)
flowlang:context Slice added, total slices in flow: 1
flowlang:context Starting client block for slice: CreateOrder
flowlang:context   Description: Order form interface
flowlang:context Client block ended for slice: CreateOrder
```

### Debug Registry Operations

```bash
DEBUG=flowlang:registry pnpm dev
```

Output example:

```
flowlang:registry Registering flow: ShoppingAssistant
flowlang:registry Total registered flows: 1
flowlang:registry Registering message: CreateOrderCommand
flowlang:registry Message registered with schema: { name, items, total }
flowlang:registry Registering integration: ProductCatalog
flowlang:registry Integration registered successfully
```

## Common Use Cases

### Debugging Flow Export

```bash
DEBUG=flowlang:flow,flowlang:context pnpm export:schema
```

### Debugging Slice Processing

```bash
DEBUG=flowlang:slice,flowlang:fluent-builder:* pnpm build
```

### Full Flow Creation Trace

```bash
DEBUG=flowlang:* pnpm dev
```

## Tips

- Use wildcards to see related logs: `DEBUG=flowlang:fluent-builder:*`
- Combine with other packages: `DEBUG=flowlang:*,emmett:*`
- Filter by operation type: `DEBUG=*:command` (all command-related logs)
- Save to file: `DEBUG=flowlang:* pnpm dev 2> flowlang-debug.log`
