[![Discord Online](https://img.shields.io/discord/1336421551255457846?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![Discord Users](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FfUn2AZsBpW%3Fwith_counts%3Dtrue&query=%24.profile.member_count&label=Total&style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange?style=for-the-badge)](https://pnpm.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange?style=for-the-badge)](https://turbo.build/repo)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg?style=for-the-badge)](https://www.elastic.co/licensing/elastic-license) [![Wallaby.js](https://img.shields.io/badge/wallaby.js-powered-blue.svg?style=for-the-badge&logo=github)](https://wallabyjs.com/oss/)

# Auto Engineer

> Put your SDLC on Auto, and build production-grade apps with humans and agents.

##### _EARLY PREVIEW_

- It will be buggy as you use it!
- We are working hard on making it awesome
- We are actively using Auto with real-world clients and use-cases
- We are making a lot of design decisions as we battle test the approach

Stay up to date by watching 👀 and giving us a star ⭐ - join the 💬 Discord for conversations.

## 🚀 Quick Start

```bash
npx create-auto-app@latest
```

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.15.4
- At least one AI provider API key:
  - [Anthropic Claude](https://console.anthropic.com/settings/keys) (Highly recommended)
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Google Gemini](https://aistudio.google.com/app/apikey)
  - [X.AI Grok](https://x.ai)

### Installation

Auto Engineer uses a plugin-based architecture. Install the CLI and only the plugins you need:

```bash
# Install the CLI globally (use Yarn or NPM if you prefer of course)
pnpm install -g @auto-engineer/cli@latest

# Create a new project directory
mkdir my-app && cd my-app

# Install plugins for your use case
pnpm install @auto-engineer/flow @auto-engineer/server-generator-apollo-emmett
# Or install all common plugins
pnpm install @auto-engineer/flow @auto-engineer/server-generator-apollo-emmett @auto-engineer/server-implementer @auto-engineer/frontend-generator-react-graphql

# Configure your API keys
echo "ANTHROPIC_API_KEY=your-key-here" > .env
```

### Plugin Configuration

Create an `auto.config.ts` file in your project root to configure plugins:

```typescript
// auto.config.ts
export default {
  plugins: [
    '@auto-engineer/flow',
    '@auto-engineer/server-generator-apollo-emmett',
    '@auto-engineer/server-implementer',
    '@auto-engineer/frontend-generator-react-graphql',
    // Add more plugins as needed
  ],

  // Optional: Override command aliases if there are conflicts
  aliases: {
    // 'command:name': '@auto-engineer/package-name'
  },
};
```

## 🔌 Plugin System

Auto Engineer uses a modular plugin architecture. Each plugin provides specific functionality:

### Core Plugins

| Plugin                      | Package                                           | Commands                                   | Description                          |
| --------------------------- | ------------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| **Flow**                    | `@auto-engineer/flow`                             | `create:example`, `export:schema`          | Flow modeling DSL and schema export  |
| **Emmett Generator**        | `@auto-engineer/server-generator-apollo-emmett`   | `generate:server`                          | Server code generation from schemas  |
| **Server Implementer**      | `@auto-engineer/server-implementer`               | `implement:server`, `implement:slice`      | AI-powered server implementation     |
| **React GraphQL Generator** | `@auto-engineer/frontend-generator-react-graphql` | `generate:client`, `copy:example`          | React client scaffolding             |
| **Frontend Implementer**    | `@auto-engineer/frontend-implementer`             | `implement:client`                         | AI-powered client implementation     |
| **Information Architect**   | `@auto-engineer/information-architect`            | `generate:ia`                              | Information architecture generation  |
| **Design System Importer**  | `@auto-engineer/design-system-importer`           | `import:design-system`                     | Figma design system import           |
| **Server Checks**           | `@auto-engineer/server-checks`                    | `check:types`, `check:lint`, `check:tests` | Server validation suite              |
| **Frontend Checks**         | `@auto-engineer/frontend-checks`                  | `check:client`                             | Frontend validation suite            |
| **File Syncer**             | `@auto-engineer/file-syncer`                      | N/A (internal use)                         | File watching and synchronization    |
| **Create Auto App**         | `@auto-engineer/create-auto-app`                  | `create:app`                               | Bootstrap new Auto Engineer projects |

### Installing Plugins

Install only the plugins you need:

```bash
# For server development
pnpm install @auto-engineer/flow @auto-engineer/server-generator-apollo-emmett @auto-engineer/server-implementer @auto-engineer/server-checks

# For frontend development
pnpm install @auto-engineer/frontend-generator-react-graphql @auto-engineer/frontend-implementer @auto-engineer/frontend-checks

# For design system integration
pnpm install @auto-engineer/design-system-importer @auto-engineer/information-architect
```

### Handling Plugin Conflicts

If multiple plugins register the same command alias, you'll see a clear error message:

```
❌ Command alias conflicts detected!

Multiple packages are trying to register the same command aliases.
Please add alias overrides to your auto.config.ts file:

export default {
  plugins: [
    '@auto-engineer/package-a',
    '@auto-engineer/package-b',
  ],
  aliases: {
    // Specify which package handles each conflicting command
    'conflicting:command': '@auto-engineer/package-a',
  }
};
```

**Note:** Each package can expose multiple commands. The alias resolution maps a specific command alias to the package that should handle it. For example, if both `package-a` and `package-b` provide a `check:types` command, you specify which package wins for that specific command alias.

## 🆕 Recent Updates

### Message Bus Server & Dashboard (v0.7.8+)

- Built-in event-driven message bus server with web dashboard
- Real-time command and event monitoring at http://localhost:5555
- WebSocket support for live updates
- DSL functions for event handling and orchestration in `auto.config.ts`

### Unified Command Handler Pattern

- All command handlers now use a single `defineCommandHandler` function
- Type-safe command definitions with automatic CLI manifest generation
- Named parameters for all CLI commands (e.g., `--input-path=value`)
- Integrated help and examples in command definitions

### Enhanced File Syncing

- Automatic file watching and syncing for development workflows
- Support for TypeScript declaration files (.d.ts)
- Flow file synchronization with related dependencies

### Browser Compatibility

- Flow package now works in browser environments
- Stub implementations for Node.js-specific modules
- Support for browser-based flow modeling tools

## 🎯 How It Works

<img width="100%" height="100%" alt="Screenshot 2025-07-23 at 9 20 03 PM" src="https://github.com/user-attachments/assets/50041682-2ec1-4148-a6d1-d51fe0680385" />

Auto automates the SDLC through a configurable pipeline of agentic and procedural modules. The process turns high-level models into production-ready code through these key stages:

1.  **Flow Modeling**: You (or an AI) start by creating a high-level ["Flow Model"](#-flow-models). This defines system behavior through command, query, and reaction "slices" that specify both frontend and server requirements. This is where the core design work happens.
2.  **IA Generation**: An "information architect" agent automatically generates an information architecture schema from your model, similar to how a UX designer creates wireframes.
3.  **Deterministic Scaffolding**: The IA schema is used to generate a complete, deterministic application scaffold.
4.  **Spec-Driven Precision**: The scaffold is populated with placeholders containing implementation hints and in-situ prompts. The initial flow model also generates deterministic tests. This combination of fine-grained prompts and tests precisely guides the AI.
5.  **AI Coding & Testing Loop**: An AI agent implements the code based on the prompts and context from previous steps. As code is written, tests are run. If they fail, the AI gets the error feedback and self-corrects, usually within 1-3 attempts.
6.  **Comprehensive Quality Checks**: After passing the tests, the code goes through further checks, including linting, runtime validation, and AI-powered visual testing to ensure design system compliance.

## 📋 CLI Commands

Commands are provided by installed plugins. Run `auto --help` to see available commands based on your configuration.

### Common Commands

All commands now use named parameters for clarity and consistency:

**Flow Development**

- `auto create:example --name=<project-name>` - Create an example project
- `auto export:schema --output-dir=<dir> --directory=<flows-dir>` - Export flow schemas

**Server Generation**

- `auto generate:server --schema-path=<schema> --destination=<dest>` - Generate server from schema
- `auto implement:server --server-directory=<dir>` - AI implements server
- `auto implement:slice --server-directory=<dir> --slice=<name>` - Implement specific slice

**Frontend Generation**

- `auto generate:ia --output-dir=<dir> --flow-files=<patterns>` - Generate Information Architecture
- `auto generate:client --starter-template=<template> --client-dir=<dir> --ia-schema=<file> --gql-schema=<file>` - Generate React client
- `auto implement:client --project-dir=<dir> --ia-scheme-dir=<dir> --design-system-path=<file>` - AI implements client

**Validation & Testing**

- `auto check:types --target-directory=<dir> --scope=<project|changed>` - TypeScript type checking
- `auto check:tests --target-directory=<dir> --scope=<project|changed>` - Run test suites
- `auto check:lint --target-directory=<dir> --fix --scope=<project|changed>` - Linting with optional auto-fix
- `auto check:client --client-directory=<dir> --skip-browser-checks` - Full frontend validation

**Design System**

- `auto import:design-system --figma-file-id=<id> --figma-access-token=<token> --output-dir=<dir>` - Import from Figma

## 🏗️ Architecture

Auto Engineer follows a command/event-driven architecture:

- **Plugin-based**: Modular design allows installing only needed functionality
- **Command Pattern**: All operations are commands that can be composed
- **Event-driven**: Loosely coupled components communicate via events
- **Type-safe**: Full TypeScript with strict typing throughout

## 🛠️ Local Development Setup

### Prerequisites for Development

- Node.js >= 20.0.0
- pnpm >= 8.15.4
- Git
- At least one AI provider API key (see Quick Start section)

### Setting Up the Development Environment

1. **Clone the repository**

   ```bash
   git clone https://github.com/SamHatoum/auto-engineer.git
   cd auto-engineer
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build all packages**

   ```bash
   pnpm build
   ```

4. **Set up environment variables**
   ```bash
   # Create .env file in the root directory
   echo "ANTHROPIC_API_KEY=your-key-here" > .env
   # Add other API keys as needed
   ```

### Working with Local Packages in Development

When developing locally, you'll want to use the local packages instead of published npm versions:

1. **Use workspace protocol in example projects**

   ```bash
   # In any example project (e.g., examples/shopping-app)
   cd examples/shopping-app

   # Install packages using workspace protocol
   pnpm add '@auto-engineer/cli@workspace:*' \
            '@auto-engineer/flow@workspace:*' \
            '@auto-engineer/server-checks@workspace:*' \
            # ... add other packages as needed
   ```

2. **The workspace protocol ensures**:
   - Local packages are used instead of npm registry versions
   - Changes to packages are immediately reflected
   - No need for npm link or manual linking

### Running the Message Bus Server

Auto Engineer includes a built-in message bus server with a web dashboard for monitoring commands and events:

```bash
# Start the server (runs on port 5555)
pnpm auto

# Or run with debug output
DEBUG=auto-engineer:* pnpm auto

# Access the dashboard at http://localhost:5555
```

The dashboard provides:

- Real-time command execution monitoring
- Event stream visualization
- Command handler registry
- WebSocket connection status
- Dark/light theme support

### Development Workflow

1. **Make changes to packages**

   ```bash
   # Edit source files in packages/*/src/
   ```

2. **Build affected packages**

   ```bash
   # Build specific package
   pnpm build --filter=@auto-engineer/cli

   # Or build all packages
   pnpm build
   ```

3. **Run tests**

   ```bash
   # Run all tests
   pnpm test

   # Run tests for specific package
   pnpm test --filter=@auto-engineer/flow
   ```

4. **Lint and type check**

   ```bash
   # Run all checks
   pnpm check

   # Individual checks
   pnpm lint
   pnpm type-check
   ```

### Creating a New Plugin

1. **Create package directory**

   ```bash
   mkdir packages/my-plugin
   cd packages/my-plugin
   ```

2. **Initialize package.json**

   ```json
   {
     "name": "@auto-engineer/my-plugin",
     "version": "0.1.0",
     "type": "module",
     "exports": {
       ".": "./dist/src/index.js"
     },
     "scripts": {
       "build": "tsc && tsx ../../scripts/fix-esm-imports.ts"
     }
   }
   ```

3. **Implement command handlers using the unified pattern**

   ```typescript
   import { defineCommandHandler } from '@auto-engineer/message-bus';

   export const commandHandler = defineCommandHandler({
     name: 'MyCommand',
     alias: 'my:command',
     description: 'Does something useful',
     category: 'My Plugin',
     fields: {
       inputPath: {
         description: 'Path to input file',
         required: true,
       },
     },
     examples: ['$ auto my:command --input-path=./file.txt'],
     handle: async (command) => {
       // Implementation
     },
   });
   ```

### Troubleshooting

**Port 5555 already in use**

```bash
# Find and kill the process
lsof -i :5555 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**Module not found errors**

```bash
# Ensure all packages are built
pnpm build

# Clear build artifacts and rebuild
pnpm clean
pnpm install
pnpm build
```

**Dashboard not showing command handlers**

- Clear browser cache and refresh (Cmd+Shift+R)
- Check browser console for JavaScript errors
- Verify packages are properly built
- Ensure auto.config.ts lists all required plugins

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

Auto Engineer is licensed under the [Elastic License 2.0 (EL2)](LICENSE.md).

## 🔗 Links

- [Discord Community](https://discord.gg/B8BKcKMRm8)
- [Documentation](https://github.com/SamHatoum/auto-engineer/wiki)
- [Issue Tracker](https://github.com/SamHatoum/auto-engineer/issues)

<img referrerpolicy="no-referrer-when-downgrade" src="https://static.on.auto/a.png?x-pxid=3e68b410-a966-4c96-887b-34102030fd15&page=README.md" />
