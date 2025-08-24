# Debug Logging - Information Architect

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

- `ia:generate-command` - Main IA generation command handling
- `ia:generate-command:schema` - Schema loading and processing
- `ia:generate-command:files` - File operations (reading flows, writing output)
- `ia:generate-command:atoms` - Atom extraction from design system
- `ia:generate-command:result` - Result generation and output

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all IA logging
DEBUG=ia:* pnpm generate-ia

# Enable specific namespace
DEBUG=ia:generate-command:schema pnpm generate-ia

# Enable multiple namespaces
DEBUG=ia:generate-command:files,ia:generate-command:atoms pnpm generate-ia

# Enable all logging
DEBUG=* pnpm generate-ia
```

## Examples

### Debug IA Generation Command

```bash
DEBUG=ia:generate-command pnpm generate-ia
```

Output example:

```
ia:generate-command Handling GenerateIA command
ia:generate-command   Output directory: ./output
ia:generate-command   Flow files: 3
ia:generate-command   Request ID: req-789
ia:generate-command   Correlation ID: corr-012
ia:generate-command Processing flows with AI...
ia:generate-command   Flow count: 3
ia:generate-command   Existing schema: yes
ia:generate-command   Atom count: 15
ia:generate-command AI processing complete
```

### Debug Schema Operations

```bash
DEBUG=ia:generate-command:schema pnpm generate-ia
```

Output example:

```
ia:generate-command:schema Loading UX schema from: src/auto-ux-schema.json
ia:generate-command:schema UX schema loaded successfully
```

### Debug File Operations

```bash
DEBUG=ia:generate-command:files pnpm generate-ia
```

Output example:

```
ia:generate-command:files Reading 3 flow files
ia:generate-command:files   Reading: flows/shopping-assistant.flow.ts
ia:generate-command:files     Size: 4523 bytes
ia:generate-command:files   Reading: flows/order-management.flow.ts
ia:generate-command:files     Size: 3210 bytes
ia:generate-command:files All flow files read successfully
ia:generate-command:files Finding unique schema path in: ./output
ia:generate-command:files Found 2 existing IA scheme files
ia:generate-command:files   File auto-ia-scheme.json -> number 0
ia:generate-command:files   File auto-ia-scheme-1.json -> number 1
ia:generate-command:files Highest numbered file: 1
ia:generate-command:files New file will use suffix: 2
ia:generate-command:files New schema will be written to: ./output/auto-ia-scheme-2.json
```

### Debug Atom Extraction

```bash
DEBUG=ia:generate-command:atoms pnpm generate-ia
```

Output example:

```
ia:generate-command:atoms Looking for design-system.md at: ./output/design-system.md
ia:generate-command:atoms Design system markdown loaded, size: 12450 bytes
ia:generate-command:atoms Scanning 450 lines for component names
ia:generate-command:atoms   Found component: Button
ia:generate-command:atoms   Found component: Input
ia:generate-command:atoms   Found component: Card
ia:generate-command:atoms   Found component: Modal
ia:generate-command:atoms Total components found: 15
ia:generate-command:atoms Created 15 atom definitions
```

### Debug Result Generation

```bash
DEBUG=ia:generate-command:result pnpm generate-ia
```

Output example:

```
ia:generate-command:result Writing IA schema to: ./output/auto-ia-scheme-2.json
ia:generate-command:result Schema JSON size: 45678 bytes
ia:generate-command:result Schema written successfully
ia:generate-command:result Returning success event: IAGenerated
ia:generate-command:result   Output path: ./output/auto-ia-scheme-2.json
```

## Common Use Cases

### Debug Full IA Generation Pipeline

```bash
DEBUG=ia:* pnpm generate-ia
```

### Debug File Processing Only

```bash
DEBUG=ia:generate-command:files,ia:generate-command:atoms pnpm generate-ia
```

### Debug with Error Details

```bash
DEBUG=ia:generate-command,ia:generate-command:result pnpm generate-ia
```

## Tips

- Use wildcards: `DEBUG=ia:generate-command:*` to see all sub-namespaces
- Combine with AI gateway debugging: `DEBUG=ia:*,ai-gateway:*`
- Save to file: `DEBUG=ia:* pnpm generate-ia 2> ia-debug.log`
- Verbose output: `DEBUG=ia:* pnpm generate-ia --verbose`
