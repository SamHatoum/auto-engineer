# Debug Logging - Server Implementer

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

- `server-impl:cli` - CLI operations and initialization
- `server-impl:flows` - Flow directory processing
- `server-impl:flows:flow` - Individual flow processing

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all server-implementer logging
DEBUG=server-impl:* pnpm implement:server

# Enable specific namespace
DEBUG=server-impl:cli pnpm implement:server

# Enable flow processing only
DEBUG=server-impl:flows:* pnpm implement:server

# Enable all logging
DEBUG=* pnpm implement:server
```

## Examples

### Debug CLI Operations

```bash
DEBUG=server-impl:cli pnpm implement:server ./server
```

Output example:

```
server-impl:cli CLI started with args: [ './server' ]
server-impl:cli Server root argument: ./server
server-impl:cli Resolved server root: /Users/project/server
server-impl:cli Flows directory: /Users/project/server/src/domain/flows
server-impl:cli Flows directory exists, starting flow runner
server-impl:cli Flow runner completed
```

### Debug Flow Processing

```bash
DEBUG=server-impl:flows pnpm implement:server
```

Output example:

```
server-impl:flows Running flows from base directory: /Users/project/server/src/domain/flows
server-impl:flows Found 3 flow directories
server-impl:flows Flow directories: [ 'shopping-assistant', 'order-management', 'user-profile' ]
server-impl:flows All 3 flows processed successfully
```

### Debug Individual Flow Processing

```bash
DEBUG=server-impl:flows:flow pnpm implement:server
```

Output example:

```
server-impl:flows:flow Processing flow: shopping-assistant
server-impl:flows:flow   Path: /Users/project/server/src/domain/flows/shopping-assistant
server-impl:flows:flow Flow shopping-assistant completed successfully
server-impl:flows:flow Processing flow: order-management
server-impl:flows:flow   Path: /Users/project/server/src/domain/flows/order-management
server-impl:flows:flow Flow order-management completed successfully
```

## Common Use Cases

### Debug Full Server Implementation

```bash
DEBUG=server-impl:* pnpm implement:server
```

### Debug with AI Gateway

```bash
DEBUG=server-impl:*,ai-gateway:* pnpm implement:server
```

### Debug Flow Errors

```bash
DEBUG=server-impl:flows:flow pnpm implement:server 2>&1 | grep ERROR
```

### Save Debug Output

```bash
DEBUG=server-impl:* pnpm implement:server 2> server-impl-debug.log
```

## Error Debugging

When errors occur, enable all namespaces to get full context:

```bash
DEBUG=server-impl:* pnpm implement:server
```

Error output example:

```
server-impl:cli ERROR: No server root path provided
server-impl:flows:flow ERROR: Flow shopping-assistant failed: Missing required files
server-impl:cli ERROR: Flow runner failed: Error: Missing required files
```

## Tips

- Start with `DEBUG=server-impl:*` to see all operations
- Use `DEBUG=server-impl:flows:flow` to focus on individual flow processing
- Combine with other packages: `DEBUG=server-impl:*,emmett:*`
- Filter errors: `DEBUG=server-impl:* pnpm implement:server 2>&1 | grep ERROR`
- Timestamp output: `DEBUG=server-impl:* pnpm implement:server 2>&1 | ts`
