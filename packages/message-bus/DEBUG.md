# Debug Logging - Message Bus

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

- `message-bus` - General message bus operations
- `message-bus:command` - Command handling operations
- `message-bus:event` - Event publishing operations
- `message-bus:handler` - Handler registration

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all message-bus logging
DEBUG=message-bus:* pnpm dev

# Enable specific namespace
DEBUG=message-bus:command pnpm dev

# Enable multiple namespaces
DEBUG=message-bus:command,message-bus:event pnpm dev

# Enable all logging
DEBUG=* pnpm dev
```

## Examples

### Debug Command Handling

```bash
DEBUG=message-bus:command pnpm test
```

Output example:

```
message-bus:command Sending command: CreateUser
message-bus:command   Request ID: req-123
message-bus:command   Correlation ID: corr-456
message-bus:command   Data keys: [ 'name', 'email' ]
message-bus:command Handler found for command: CreateUser
message-bus:command Executing handler for: CreateUser
message-bus:command Handler executed successfully in 45ms
```

### Debug Handler Registration

```bash
DEBUG=message-bus:handler pnpm dev
```

Output example:

```
message-bus:handler Registering command handler: CreateUser
message-bus:handler Handler registered successfully, total handlers: 1
message-bus:handler Registering command handler: UpdateUser
message-bus:handler Handler registered successfully, total handlers: 2
```

### Debug Event Publishing

```bash
DEBUG=message-bus:event pnpm dev
```

Output example:

```
message-bus:event Publishing event: UserCreated
message-bus:event   Request ID: req-123
message-bus:event   Correlation ID: corr-456
message-bus:event   Timestamp: 2024-01-20T10:30:00.000Z
message-bus:event   Data keys: [ 'userId', 'name', 'email' ]
```

## Tips

- Use wildcards: `DEBUG=message-bus:*` to see all message-bus logs
- Combine with other packages: `DEBUG=message-bus:*,flow:*`
- Save to file: `DEBUG=message-bus:* pnpm dev 2> debug.log`
- Disable colors: `DEBUG_COLORS=false DEBUG=message-bus:* pnpm dev`
