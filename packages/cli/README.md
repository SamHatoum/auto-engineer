# @auto-engineer/cli

CLI interface for Auto Engineer - a plugin-based command-line tool for building applications with AI assistance.

## Features

- Plugin-based architecture - Install only the functionality you need
- POSIX-compliant command line arguments
- Interactive prompts and error messages
- Colored output with graceful degradation
- Progress spinners and prompts
- Structured output in JSON format
- Cross-platform compatibility
- Configuration precedence (CLI args > env vars > config files)
- Analytics with opt-in
- Error handling with error codes
- Debug mode for troubleshooting

## Installation

```bash
# Install globally
npm install -g @auto-engineer/cli

# Or use with npx
npx @auto-engineer/cli

# Or with pnpm
pnpm install -g @auto-engineer/cli
```

## Plugin System

The CLI uses a plugin-based architecture. Install only the functionality you need:

### Quick Start

1. Install the CLI:

```bash
npm install -g @auto-engineer/cli
```

2. Install plugins for your use case:

```bash
# For backend development
npm install @auto-engineer/flowlang @auto-engineer/emmett-generator @auto-engineer/server-implementer

# For frontend development
npm install @auto-engineer/react-graphql-generator @auto-engineer/frontend-implementation

# For validation and testing
npm install @auto-engineer/backend-checks @auto-engineer/frontend-checks
```

3. Create configuration (`auto.config.ts`):

```typescript
export default {
  plugins: ['@auto-engineer/flowlang', '@auto-engineer/emmett-generator', '@auto-engineer/server-implementer'],

  // Optional: Handle command conflicts
  aliases: {
    // 'command:alias': '@auto-engineer/package-name'
  },
};
```

4. Run commands:

```bash
auto create:example shopping-assistant
auto export:schema ./.context ./flows
auto generate:server .context/schema.json .
```

## Available Plugins

| Plugin                                   | Commands                                   | Description                         |
| ---------------------------------------- | ------------------------------------------ | ----------------------------------- |
| `@auto-engineer/flowlang`                | `create:example`, `export:schema`          | Flow modeling and schema export     |
| `@auto-engineer/emmett-generator`        | `generate:server`                          | Server code generation              |
| `@auto-engineer/server-implementer`      | `implement:server`, `implement:slice`      | AI server implementation            |
| `@auto-engineer/react-graphql-generator` | `generate:client`, `copy:example`          | React client scaffolding            |
| `@auto-engineer/frontend-implementation` | `implement:client`                         | AI client implementation            |
| `@auto-engineer/information-architect`   | `generate:ia`                              | Information architecture generation |
| `@auto-engineer/design-system-importer`  | `import:design-system`                     | Figma design system import          |
| `@auto-engineer/backend-checks`          | `check:types`, `check:lint`, `check:tests` | Backend validation                  |
| `@auto-engineer/frontend-checks`         | `check:client`                             | Frontend validation                 |

## Configuration

### Plugin Configuration

The CLI looks for an `auto.config.ts` file in your project root:

```typescript
// auto.config.ts
export default {
  // List of npm packages to load as plugins
  plugins: [
    '@auto-engineer/flowlang',
    '@auto-engineer/emmett-generator',
    // ... more plugins
  ],

  // Optional: Override command aliases when conflicts occur
  aliases: {
    'create:example': '@auto-engineer/flowlang',
    // ... more overrides
  },
};
```

### Handling Conflicts

When multiple plugins register the same command alias, you'll receive an error with instructions:

```
Command alias conflicts detected!

Multiple packages are trying to register the same command aliases.
Please add alias overrides to your auto.config.ts file:

export default {
  plugins: [
    '@auto-engineer/package-a',
    '@auto-engineer/package-b',
  ],
  aliases: {
    // Map the conflicting command to the package that should handle it
    'conflicting:command': '@auto-engineer/package-a',
  }
};
```

The alias resolution works per command, not per package. Each package can expose multiple commands, and you resolve conflicts for specific command aliases. For example, if both `backend-checks` and `another-package` provide a `check:types` command, you specify which package handles that specific command.

## Commands

Commands are provided by installed plugins. Run `auto --help` to see available commands based on your configuration.

### Common Plugin Commands

Flow Development (requires `@auto-engineer/flowlang`)

- `create:example <name>` - Create an example project
- `export:schema <context> <flows>` - Export flow schemas

Backend Generation (requires respective plugins)

- `generate:server <schema> <dest>` - Generate server from schema
- `implement:server <server-dir>` - AI implements server

Frontend Generation (requires respective plugins)

- `generate:ia <context> <flows...>` - Generate Information Architecture
- `generate:client <starter> <client> <ia> <gql> [vars]` - Generate React client
- `implement:client <client> <context> <principles> <design>` - AI implements client

Validation & Testing (requires check plugins)

- `check:types <directory>` - TypeScript type checking
- `check:tests <directory>` - Run test suites
- `check:lint <directory> [--fix]` - Linting with optional auto-fix
- `check:client <client-dir>` - Full frontend validation

## Global Options

- `-v, --version` - Show version number
- `-d, --debug` - Enable debug mode
- `--no-color` - Disable colored output
- `--json` - Output in JSON format
- `--api-token <token>` - API token for external services
- `--project-path <path>` - Project path to work with

## Environment Variables

Set these in your `.env` file or environment:

```bash
# AI Provider Keys (need at least one)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
XAI_API_KEY=...

# Debugging
DEBUG=cli:*              # Debug CLI operations
DEBUG=cli:plugin-loader  # Debug plugin loading

# Configuration
NO_COLOR=1               # Disable colored output
AUTO_ENGINEER_ANALYTICS=false  # Disable usage analytics
```

## Creating a Plugin

Plugins are npm packages that export a `CLI_MANIFEST`:

```typescript
// your-plugin/src/cli-manifest.ts
export const CLI_MANIFEST = {
  commands: {
    'your:command': {
      handler: () => import('./commands/your-command'),
      description: 'Description of your command',
    },
  },
};

// your-plugin/src/index.ts
export { CLI_MANIFEST } from './cli-manifest';
export * from './commands/your-command';
```

The command handler should export a function that handles the command:

```typescript
// your-plugin/src/commands/your-command.ts
export async function handleYourCommand(command: { type: string; data: any; timestamp: Date; requestId: string }) {
  // Implementation
}
```

## Built-in Commands

When no `auto.config.ts` is present, the CLI falls back to built-in commands that work with locally available packages.

## Error Codes

Auto-engineer uses standardized error codes for easy troubleshooting:

- `E4001` - Validation error
- `E4002` - Configuration error
- `E4003` - Invalid API token
- `E4004` - Invalid project path
- `E5001` - Runtime error
- `E9999` - Unknown error

## Analytics

Auto-engineer collects anonymous usage analytics to improve the tool:

- Anonymous - No personal information is collected
- Transparent - You can see what data is collected in debug mode
- Controllable - You can disable anytime

To disable analytics:

```bash
export AUTO_ENGINEER_ANALYTICS=false
```

## Debugging

Enable debug output to troubleshoot issues:

```bash
# Debug everything
DEBUG=* auto create:example test

# Debug plugin loading
DEBUG=cli:plugin-loader auto --help

# Debug specific plugins
DEBUG=flowlang:* auto export:schema ./context ./flows
```

## License

Part of the Auto Engineer monorepo. Licensed under [Elastic License 2.0](../../LICENSE.md).

## Support

- Discord: [Join our community](https://discord.gg/B8BKcKMRm8)
- Documentation: [GitHub Wiki](https://github.com/SamHatoum/auto-engineer/wiki)
- Issues: [GitHub Issues](https://github.com/SamHatoum/auto-engineer/issues)
