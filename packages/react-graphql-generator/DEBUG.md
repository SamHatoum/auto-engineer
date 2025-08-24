# Debug Logging - React GraphQL Generator

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

- `react-gql:generate` - Main generation operations
- `react-gql:schema` - Schema processing and analysis
- `react-gql:components` - Component generation
- `react-gql:graphql` - GraphQL operations and queries

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all react-graphql-generator logging
DEBUG=react-gql:* pnpm generate:client

# Enable specific namespace
DEBUG=react-gql:generate pnpm generate:client

# Enable multiple namespaces
DEBUG=react-gql:schema,react-gql:components pnpm generate:client

# Enable all logging
DEBUG=* pnpm generate:client
```

## Examples

### Debug Generation Process

```bash
DEBUG=react-gql:generate pnpm generate:client
```

Output example:

```
react-gql:generate Starting React GraphQL generation
react-gql:generate   Input directory: ./.context
react-gql:generate   Output directory: ./client
react-gql:generate   IA scheme found: auto-ia-scheme.json
react-gql:generate   GraphQL schema found: schema.graphql
react-gql:generate Loading configuration files
react-gql:generate Parsing IA scheme
react-gql:generate   Pages: 5
react-gql:generate   Organisms: 12
react-gql:generate   Molecules: 24
react-gql:generate   Atoms: 36
react-gql:generate Generation completed successfully
react-gql:generate   Components generated: 77
react-gql:generate   GraphQL operations: 15
```

### Debug Schema Processing

```bash
DEBUG=react-gql:schema pnpm generate:client
```

Output example:

```
react-gql:schema Loading GraphQL schema from: schema.graphql
react-gql:schema Schema loaded, size: 12345 bytes
react-gql:schema Parsing GraphQL schema
react-gql:schema   Types found: 25
react-gql:schema   Queries: 8
react-gql:schema   Mutations: 12
react-gql:schema   Subscriptions: 2
react-gql:schema Analyzing type relationships
react-gql:schema   Input types: 15
react-gql:schema   Object types: 10
react-gql:schema   Enums: 5
react-gql:schema Schema analysis complete
```

### Debug Component Generation

```bash
DEBUG=react-gql:components pnpm generate:client
```

Output example:

```
react-gql:components Generating page component: HomePage
react-gql:components   Template: page.tsx.ejs
react-gql:components   Organisms: 3
react-gql:components   Props: navigation, user, content
react-gql:components Generating organism component: ProductGrid
react-gql:components   Template: organism.tsx.ejs
react-gql:components   Molecules: 5
react-gql:components   GraphQL operations: 2
react-gql:components Generating molecule component: ProductCard
react-gql:components   Template: molecule.tsx.ejs
react-gql:components   Atoms: 4
react-gql:components   Props: product, onSelect, isLoading
react-gql:components Generating atom component: Button
react-gql:components   Template: atom.tsx.ejs
react-gql:components   Shadcn/ui base: button
react-gql:components   Variants: primary, secondary, danger
```

### Debug GraphQL Operations

```bash
DEBUG=react-gql:graphql pnpm generate:client
```

Output example:

```
react-gql:graphql Generating GraphQL operation: GetProducts
react-gql:graphql   Type: query
react-gql:graphql   Variables: categoryId, limit, offset
react-gql:graphql   Return type: ProductConnection
react-gql:graphql Generating GraphQL operation: CreateOrder
react-gql:graphql   Type: mutation
react-gql:graphql   Input type: CreateOrderInput
react-gql:graphql   Return type: OrderPayload
react-gql:graphql Generating Apollo hooks
react-gql:graphql   useGetProductsQuery
react-gql:graphql   useCreateOrderMutation
react-gql:graphql GraphQL operations written to: src/graphql/
```

## Common Use Cases

### Debug Full Generation Pipeline

```bash
DEBUG=react-gql:* pnpm generate:client
```

### Debug Schema and Components

```bash
DEBUG=react-gql:schema,react-gql:components pnpm generate:client
```

### Debug with IA Processing

```bash
DEBUG=react-gql:*,ia:* pnpm generate:client
```

### Debug GraphQL Generation

```bash
DEBUG=react-gql:graphql,react-gql:schema pnpm generate:client
```

### Save Debug Output

```bash
DEBUG=react-gql:* pnpm generate:client 2> react-gql-debug.log
```

## File Generation Patterns

The generator creates files following these patterns:

```
client/
├── src/
│   ├── pages/
│   │   └── [PageName].tsx
│   ├── components/
│   │   ├── organisms/
│   │   │   └── [OrganismName].tsx
│   │   ├── molecules/
│   │   │   └── [MoleculeName].tsx
│   │   └── atoms/
│   │       └── [AtomName].tsx
│   └── graphql/
│       ├── operations.ts
│       └── types.ts
```

## Template Processing

Debug template processing with:

```bash
DEBUG=react-gql:components pnpm generate:client
```

This shows:

- Template selection
- Data passed to templates
- Component relationships
- Props and types generation

## Tips

- Start with `DEBUG=react-gql:generate` for overview
- Use `DEBUG=react-gql:components` to trace component generation
- Monitor GraphQL with `DEBUG=react-gql:graphql`
- Combine with IA: `DEBUG=react-gql:*,ia:*`
- Filter by component type: `DEBUG=react-gql:components | grep atom`
