# Debug Logging - Frontend Implementation

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

- `frontend-impl:agent` - Main agent operations
- `frontend-impl:agent:context` - Context loading (IA scheme, GraphQL, design system)
- `frontend-impl:agent:plan` - Implementation planning
- `frontend-impl:agent:fix` - Fix application
- `frontend-impl:agent:test` - Test execution
- `frontend-impl:agent:ai` - AI provider calls
- `frontend-impl:agent:files` - File operations
- `frontend-impl:agent:prompt` - Prompt generation
- `frontend-impl:agent:result` - Result handling

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all frontend-implementation logging
DEBUG=frontend-impl:* pnpm implement:client

# Enable specific namespace
DEBUG=frontend-impl:agent:plan pnpm implement:client

# Enable multiple namespaces
DEBUG=frontend-impl:agent:context,frontend-impl:agent:ai pnpm implement:client

# Enable all logging
DEBUG=* pnpm implement:client
```

## Examples

### Debug Context Loading

```bash
DEBUG=frontend-impl:agent:context pnpm implement:client
```

Output example:

```
frontend-impl:agent:context Loading IA scheme from: ./.context
frontend-impl:agent:context IA scheme loaded successfully
frontend-impl:agent:context Scheme has 5 pages, 12 organisms, 24 molecules, 36 atoms
frontend-impl:agent:context Found 8 GraphQL files
frontend-impl:agent:context Reading GraphQL file: src/graphql/CreateOrder.ts
frontend-impl:agent:context Loaded GraphQL operations from CreateOrder
frontend-impl:agent:context Loading design system from: ./design-system.md
frontend-impl:agent:context Design system loaded, size: 15234 bytes
```

### Debug Planning Operations

```bash
DEBUG=frontend-impl:agent:plan pnpm implement:client
```

Output example:

```
frontend-impl:agent:plan Creating implementation plan
frontend-impl:agent:plan Analyzing 5 pages, 12 organisms, 24 molecules
frontend-impl:agent:plan Generating plan with AI
frontend-impl:agent:plan AI returned plan with 15 changes
frontend-impl:agent:plan Plan includes:
frontend-impl:agent:plan   Updates: 8
frontend-impl:agent:plan   Creates: 7
frontend-impl:agent:plan Applying plan changes
frontend-impl:agent:plan Processing change 1/15: update src/components/Button.tsx
frontend-impl:agent:plan Read existing file src/components/Button.tsx, size: 1234 bytes
frontend-impl:agent:plan Generated code for src/components/Button.tsx, size: 1456 bytes
frontend-impl:agent:plan Successfully wrote file: src/components/Button.tsx
```

### Debug AI Calls

```bash
DEBUG=frontend-impl:agent:ai pnpm implement:client
```

Output example:

```
frontend-impl:agent:ai Calling AI with prompt length: 4567 characters
frontend-impl:agent:ai Using model: claude-3-5-sonnet-20241022
frontend-impl:agent:ai AI call initiated
frontend-impl:agent:ai AI response received, length: 2345 characters
frontend-impl:agent:ai AI call completed successfully
```

### Debug Test Execution

```bash
DEBUG=frontend-impl:agent:test pnpm implement:client
```

Output example:

```
frontend-impl:agent:test Running tests in: ./client
frontend-impl:agent:test Executing: pnpm test
frontend-impl:agent:test Test output: All tests passed (15/15)
frontend-impl:agent:test Tests passed successfully
```

### Debug File Operations

```bash
DEBUG=frontend-impl:agent:files pnpm implement:client
```

Output example:

```
frontend-impl:agent:files Reading file: src/components/Button.tsx
frontend-impl:agent:files File read successfully, size: 1234 bytes
frontend-impl:agent:files Writing file: src/components/Button.tsx
frontend-impl:agent:files File written successfully, size: 1456 bytes
frontend-impl:agent:files Creating directory: src/components/molecules
frontend-impl:agent:files Directory created successfully
```

### Debug Prompt Generation

```bash
DEBUG=frontend-impl:agent:prompt pnpm implement:client
```

Output example:

```
frontend-impl:agent:prompt Building base prompt with context
frontend-impl:agent:prompt   IA scheme: present (5 pages)
frontend-impl:agent:prompt   Design system: present (15234 bytes)
frontend-impl:agent:prompt   GraphQL operations: 8
frontend-impl:agent:prompt   User preferences: responsive, accessible
frontend-impl:agent:prompt Base prompt length: 8765 characters
frontend-impl:agent:prompt Creating plan prompt
frontend-impl:agent:prompt Plan prompt length: 9876 characters
```

## Common Use Cases

### Debug Full Implementation

```bash
DEBUG=frontend-impl:* pnpm implement:client
```

### Debug Planning and Application

```bash
DEBUG=frontend-impl:agent:plan,frontend-impl:agent:fix pnpm implement:client
```

### Debug with AI Details

```bash
DEBUG=frontend-impl:agent:ai,frontend-impl:agent:prompt pnpm implement:client
```

### Debug Context and Files

```bash
DEBUG=frontend-impl:agent:context,frontend-impl:agent:files pnpm implement:client
```

### Save Debug Output

```bash
DEBUG=frontend-impl:* pnpm implement:client 2> frontend-debug.log
```

## Tips

- Start broad with `DEBUG=frontend-impl:*` then narrow down
- Use `DEBUG=frontend-impl:agent:ai` to monitor AI usage
- Combine with AI gateway: `DEBUG=frontend-impl:*,ai-gateway:*`
- Filter by operation: `DEBUG=*:context` for all context operations
- Exclude verbose: `DEBUG=frontend-impl:*,-frontend-impl:agent:files`
