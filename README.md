[![Discord Online](https://img.shields.io/discord/1336421551255457846?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![Discord Users](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FfUn2AZsBpW%3Fwith_counts%3Dtrue&query=%24.profile.member_count&label=Total&style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange?style=for-the-badge)](https://pnpm.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange?style=for-the-badge)](https://turbo.build/repo)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg?style=for-the-badge)](https://www.elastic.co/licensing/elastic-license)

# Auto Engineer

> Put your SDLC on Auto, and build production-grade apps with humans and agents.

##### _EARLY PREVIEW_

- We are working hard on making it happen
- We are actively using Auto with real-world clients and use-cases
- We are making a lot of design decisions as we battle test the approach

Stay up to date by watching 👀 and giving us a star ⭐ - join the 💬 Discord for conversations.

## 🚀 Quick Start

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

### Create Your First App

```bash
# With plugins configured, create a new app
auto create:example shopping-assistant

# Navigate to the created project
cd shopping-assistant
pnpm install

# Export the flow schemas
auto export:schema ./.context ./flows

# Generate and implement the server
auto generate:server .context/schema.json .
auto implement:server ./server

# Run server validation
auto check:types ./server
auto check:tests ./server
auto check:lint ./server --fix

# Generate frontend (requires additional plugins)
auto generate:ia ./.context ./flows/*.flow.ts
auto generate:client ./shadcn-starter ./client ./auto-ia.json ./schema.graphql ./figma-vars.json
auto implement:client ./client ./.context ./design-principles.md ./design-system.md

# Start the application
pnpm start
```

## 🔌 Plugin System

Auto Engineer uses a modular plugin architecture. Each plugin provides specific functionality:

### Core Plugins

| Plugin                      | Package                                           | Commands                                   | Description                         |
| --------------------------- | ------------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| **Flow**                    | `@auto-engineer/flow`                             | `create:example`, `export:schema`          | Flow modeling DSL and schema export |
| **Emmett Generator**        | `@auto-engineer/server-generator-apollo-emmett`   | `generate:server`                          | Server code generation from schemas |
| **Server Implementer**      | `@auto-engineer/server-implementer`               | `implement:server`, `implement:slice`      | AI-powered server implementation    |
| **React GraphQL Generator** | `@auto-engineer/frontend-generator-react-graphql` | `generate:client`, `copy:example`          | React client scaffolding            |
| **Frontend Implementer**    | `@auto-engineer/frontend-implementer`             | `implement:client`                         | AI-powered client implementation    |
| **Information Architect**   | `@auto-engineer/information-architect`            | `generate:ia`                              | Information architecture generation |
| **Design System Importer**  | `@auto-engineer/design-system-importer`           | `import:design-system`                     | Figma design system import          |
| **Server Checks**           | `@auto-engineer/server-checks`                    | `check:types`, `check:lint`, `check:tests` | Server validation suite             |
| **Frontend Checks**         | `@auto-engineer/frontend-checks`                  | `check:client`                             | Frontend validation suite           |

### Installing Plugins

Install only the plugins you need:

```bash
# For server development
npm install @auto-engineer/flow @auto-engineer/server-generator-apollo-emmett @auto-engineer/server-implementer @auto-engineer/server-checks

# For frontend development
npm install @auto-engineer/frontend-generator-react-graphql @auto-engineer/frontend-implementer @auto-engineer/frontend-checks

# For design system integration
npm install @auto-engineer/design-system-importer @auto-engineer/information-architect
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

**Flow Development**

- `create:example <name>` - Create an example project
- `export:schema <context> <flows>` - Export flow schemas

**Server Generation**

- `generate:server <schema> <dest>` - Generate server from schema
- `implement:server <server-dir>` - AI implements server

**Frontend Generation**

- `generate:ia <context> <flows...>` - Generate Information Architecture
- `generate:client <starter> <client> <ia> <gql> [vars]` - Generate React client
- `implement:client <client> <context> <principles> <design>` - AI implements client

**Validation & Testing**

- `check:types <directory>` - TypeScript type checking
- `check:tests <directory>` - Run test suites
- `check:lint <directory> [--fix]` - Linting with optional auto-fix
- `check:client <client-dir>` - Full frontend validation

## 🏗️ Architecture

Auto Engineer follows a command/event-driven architecture:

- **Plugin-based**: Modular design allows installing only needed functionality
- **Command Pattern**: All operations are commands that can be composed
- **Event-driven**: Loosely coupled components communicate via events
- **Type-safe**: Full TypeScript with strict typing throughout

## 📦 Monorepo Structure

```
auto-engineer/
├── packages/
│   ├── cli/                               # Main CLI with plugin loader
│   ├── flow/                              # Flow modeling DSL
│   ├── server-generator-apollo-emmett/    # Server code generation
│   ├── server-implementer/                # AI server implementation
│   ├── frontend-generator-react-graphql/  # React client scaffolding
│   ├── frontend-implementer/              # AI client implementation
│   ├── information-architect/             # IA generation
│   ├── design-system-importer/            # Figma integration
│   ├── server-checks/                     # Server validation
│   ├── frontend-checks/                   # Frontend validation
│   ├── ai-gateway/                        # Unified AI provider interface
│   ├── message-bus/                       # Event-driven messaging
│   └── file-store/                        # File system operations
├── integrations/
│   ├── ai-chat-completion/                # AI provider integrations
│   ├── cart/                              # Cart service integration
│   └── product-catalogue/                 # Product catalog integration
└── examples/
    ├── cart-api/                          # Example cart API
    └── product-catalogue-api/             # Example product API
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

Auto Engineer is licensed under the [Elastic License 2.0 (EL2)](LICENSE.md).

## 🔗 Links

- [Discord Community](https://discord.gg/B8BKcKMRm8)
- [Documentation](https://github.com/SamHatoum/auto-engineer/wiki)
- [Issue Tracker](https://github.com/SamHatoum/auto-engineer/issues)
