# Debug Logging - Emmett Generator

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

### Command Generation

- `emmett:command:generate` - Main command generation
- `emmett:command:handler` - Command handler operations
- `emmett:command:process` - Process management
- `emmett:command:output` - Output handling
- `emmett:command:result` - Result processing

### Scaffolding Operations

- `emmett:scaffolding` - General scaffolding operations
- `emmett:scaffolding:flow` - Flow processing
- `emmett:scaffolding:slice` - Slice generation
- `emmett:scaffolding:plan` - File plan generation
- `emmett:scaffolding:template` - Template processing

### Message Extraction

- `emmett:extract:messages` - Message extraction
- `emmett:extract:messages:command` - Command extraction
- `emmett:extract:messages:query` - Query extraction
- `emmett:extract:messages:react` - Reaction extraction
- `emmett:extract:messages:dedupe` - Deduplication

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all emmett logging
DEBUG=emmett:* pnpm generate-server

# Enable specific namespace
DEBUG=emmett:command:generate pnpm generate-server

# Enable all scaffolding operations
DEBUG=emmett:scaffolding:* pnpm generate-server

# Enable message extraction
DEBUG=emmett:extract:* pnpm generate-server
```

## Examples

### Debug Command Generation

```bash
DEBUG=emmett:command:* pnpm generate-server
```

Output example:

```
emmett:command:generate Handling GenerateServerCommand
emmett:command:generate   Context directory: ./.context
emmett:command:generate   Server directory: ./server
emmett:command:generate   Request ID: req-456
emmett:command:handler Loading specs from: ./.context/specs.json
emmett:command:handler Specs loaded successfully
emmett:command:handler   Flows: 3
emmett:command:handler   Messages: 25
emmett:command:handler   Integrations: 2
emmett:command:process Spawning process: npx tsx generate-server.ts
emmett:command:process Child process spawned with PID: 12345
emmett:command:output STDOUT: Generating server code...
emmett:command:result Server generation completed successfully
```

### Debug Scaffolding

```bash
DEBUG=emmett:scaffolding:* pnpm generate-server
```

Output example:

```
emmett:scaffolding Generating scaffold file plans
emmett:scaffolding   Number of flows: 3
emmett:scaffolding   Number of messages: 25
emmett:scaffolding   Base directory: src/domain/flows
emmett:scaffolding:flow Processing flow: ShoppingAssistant
emmett:scaffolding:flow   Flow directory: src/domain/flows/shopping-assistant
emmett:scaffolding:flow   Number of slices: 5
emmett:scaffolding:slice Generating files for slice: CreateOrder (type: command)
emmett:scaffolding:slice   Flow: ShoppingAssistant
emmett:scaffolding:slice   Output directory: src/domain/flows/shopping-assistant/create-order
emmett:scaffolding:slice   Found 8 templates for slice type
emmett:scaffolding:slice   Extracted messages:
emmett:scaffolding:slice     Commands: 1
emmett:scaffolding:slice     Events: 2
emmett:scaffolding:slice     States: 0
emmett:scaffolding:plan Writing 45 scaffold file plans
emmett:scaffolding:plan   Writing file: src/domain/flows/shopping-assistant/create-order/command.ts
emmett:scaffolding:plan     Content size: 2456 bytes
emmett:scaffolding:plan All 45 files written successfully
```

### Debug Message Extraction

```bash
DEBUG=emmett:extract:messages:* pnpm generate-server
```

Output example:

```
emmett:extract:messages Extracting messages from slice: CreateOrder (type: command)
emmett:extract:messages   Total message definitions available: 25
emmett:extract:messages:command Extracting messages for command slice: CreateOrder
emmett:extract:messages:command   Found 3 GWT specs
emmett:extract:messages:command   Extracted 1 commands
emmett:extract:messages:command   Command schemas: [ 'CreateOrderCommand' ]
emmett:extract:messages:command     GWT: given=2 events, then=1 events
emmett:extract:messages:command   Total events extracted: 3
emmett:extract:messages:dedupe Deduplicating 3 messages
emmett:extract:messages:dedupe   Added unique message: OrderCreated
emmett:extract:messages:dedupe   Skipped duplicate message: OrderCreated
emmett:extract:messages:dedupe Result: 2 unique messages from 3 total
```

### Debug Template Processing

```bash
DEBUG=emmett:scaffolding:template pnpm generate-server
```

Output example:

```
emmett:scaffolding:template Processing template: command.ejs
emmett:scaffolding:template   Template path: templates/command/command.ejs
emmett:scaffolding:template   Output file: command.ts
emmett:scaffolding:template   Template data keys: [ 'flowName', 'sliceName', 'commands', 'events' ]
emmett:scaffolding:template Template rendered successfully
emmett:scaffolding:template   Output size: 2456 bytes
```

## Common Use Cases

### Debug Full Server Generation

```bash
DEBUG=emmett:* pnpm generate-server
```

### Debug Scaffolding Only

```bash
DEBUG=emmett:scaffolding:*,emmett:extract:* pnpm generate-server
```

### Debug Command Processing

```bash
DEBUG=emmett:command:*,emmett:extract:messages:command pnpm generate-server
```

### Debug with Flow Processing

```bash
DEBUG=emmett:*,flow:* pnpm generate-server
```

## Tips

- Use wildcards: `DEBUG=emmett:scaffolding:*` for all scaffolding logs
- Combine operations: `DEBUG=emmett:command:*,emmett:scaffolding:*`
- Filter by type: `DEBUG=*:command` for all command-related logs
- Save to file: `DEBUG=emmett:* pnpm generate-server 2> emmett-debug.log`
- Exclude verbose: `DEBUG=emmett:*,-emmett:extract:messages:dedupe`
