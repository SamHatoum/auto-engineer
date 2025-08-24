# Debug Logging - Design System Importer

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

- `design-importer:command` - Command handling
- `design-importer:handler` - Import handler operations
- `design-importer:filter` - Filter loading and application
- `design-importer:result` - Result generation
- `design-importer:builder` - Figma component builder
- `design-importer:builder:api` - Figma API calls
- `design-importer:builder:components` - Component extraction
- `design-importer:builder:tree` - Tree walking operations

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all design-importer logging
DEBUG=design-importer:* pnpm import:design-system

# Enable specific namespace
DEBUG=design-importer:builder:api pnpm import:design-system

# Enable builder operations
DEBUG=design-importer:builder:* pnpm import:design-system

# Enable all logging
DEBUG=* pnpm import:design-system
```

## Examples

### Debug Command Handling

```bash
DEBUG=design-importer:command pnpm import:design-system
```

Output example:

```
design-importer:command Handling ImportDesignSystemCommand
design-importer:command   Output directory: ./output
design-importer:command   Strategy: WITH_COMPONENT_SETS
design-importer:command   Filter path: ./filters/custom-filter.js
design-importer:command   Request ID: req-123
design-importer:command   Correlation ID: corr-456
```

### Debug Figma API Operations

```bash
DEBUG=design-importer:builder:api pnpm import:design-system
```

Output example:

```
design-importer:builder:api Fetching Figma file: file-key-123
design-importer:builder:api   Using strategy: WITH_COMPONENT_SETS
design-importer:builder:api Making API request to Figma
design-importer:builder:api Response received, status: 200
design-importer:builder:api File document received, starting tree walk
```

### Debug Component Extraction

```bash
DEBUG=design-importer:builder:components pnpm import:design-system
```

Output example:

```
design-importer:builder:components Extracting component sets from Figma
design-importer:builder:components Found 15 component sets
design-importer:builder:components Processing component set: Button
design-importer:builder:components   Variants: 8
design-importer:builder:components   Properties: size, variant, state
design-importer:builder:components Processing component set: Input
design-importer:builder:components   Variants: 6
design-importer:builder:components   Properties: size, state, type
design-importer:builder:components Extracted 45 unique component instances
```

### Debug Tree Walking

```bash
DEBUG=design-importer:builder:tree pnpm import:design-system
```

Output example:

```
design-importer:builder:tree Starting tree walk from document root
design-importer:builder:tree Visiting node: Page 1 (type: PAGE)
design-importer:builder:tree   Has 5 children
design-importer:builder:tree   Visiting node: Header Component (type: COMPONENT)
design-importer:builder:tree     -> Found new instance: Header
design-importer:builder:tree        Description: present
design-importer:builder:tree        Thumbnail: present
design-importer:builder:tree   Visiting node: Button Instance (type: INSTANCE)
design-importer:builder:tree     -> Instance already tracked: Button
design-importer:builder:tree Tree walk complete
```

### Debug Filter Operations

```bash
DEBUG=design-importer:filter pnpm import:design-system
```

Output example:

```
design-importer:filter Loading custom filter from: ./filters/custom-filter.js
design-importer:filter FilterLoader instance created
design-importer:filter Creating temporary file for filter
design-importer:filter   Temp file: /tmp/filter-12345.mjs
design-importer:filter Importing filter module
design-importer:filter Filter function loaded successfully
design-importer:filter Applying filter to component: Button
design-importer:filter   Filter result: include
design-importer:filter Applying filter to component: InternalComponent
design-importer:filter   Filter result: exclude
design-importer:filter Cleaning up FilterLoader
```

### Debug Result Handling

```bash
DEBUG=design-importer:result pnpm import:design-system
```

Output example:

```
design-importer:result Import completed successfully
design-importer:result Returning success event: DesignSystemImported
design-importer:result   Output directory: ./output
design-importer:result   Components processed: 45
design-importer:result   Files generated: 3
```

## Common Use Cases

### Debug Full Import Process

```bash
DEBUG=design-importer:* pnpm import:design-system
```

### Debug Figma Operations Only

```bash
DEBUG=design-importer:builder:* pnpm import:design-system
```

### Debug with Filter Details

```bash
DEBUG=design-importer:filter,design-importer:builder:components pnpm import:design-system
```

### Debug API and Tree Walking

```bash
DEBUG=design-importer:builder:api,design-importer:builder:tree pnpm import:design-system
```

### Save Debug Output

```bash
DEBUG=design-importer:* pnpm import:design-system 2> design-import-debug.log
```

## Environment Variables

Required for Figma API access:

```bash
FIGMA_ACCESS_TOKEN=your-figma-token
FIGMA_FILE_ID=your-file-id
```

## Tips

- Use `DEBUG=design-importer:builder:*` to see all Figma operations
- Monitor API calls with `DEBUG=design-importer:builder:api`
- Track component processing with `DEBUG=design-importer:builder:components`
- Combine with other packages: `DEBUG=design-importer:*,ia:*`
- Filter verbose output: `DEBUG=design-importer:*,-design-importer:builder:tree`
