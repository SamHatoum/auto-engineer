[![Discord Online](https://img.shields.io/discord/1336421551255457846?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![Discord Users](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FfUn2AZsBpW%3Fwith_counts%3Dtrue&query=%24.profile.member_count&label=Total&style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange?style=for-the-badge)](https://pnpm.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange?style=for-the-badge)](https://turbo.build/repo)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg?style=for-the-badge)](https://www.elastic.co/licensing/elastic-license)

# Auto Engineer

> Put your SDLC on Auto, and build production-grade apps with agents.

##### _EARLY PREVIEW_

- We are working hard on making it happen
- We are actively using Auto with real-world clients and use-cases
- We are making a lot of design decisions as we battle test the approach

Stay up to date by watching 👀☝️ and giving us a star ⭐☝️ - join the Discord for conversations.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.15.4
- At least one AI provider API key:
  - [Anthropic Claude](https://console.anthropic.com/settings/keys) (Recommended)
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Google Gemini](https://aistudio.google.com/app/apikey)
  - [X.AI Grok](https://x.ai)

### Installation

```bash
# Install the CLI globally
pnpm install -g @auto-engineer/cli@latest

# Or use locally from the monorepo
git clone https://github.com/SamHatoum/auto-engineer
cd auto-engineer
pnpm install
pnpm build

# Copy and configure your API keys
cp .env.example .env
# Edit .env and add your API key(s)
```

### Create Your First App

```bash
# Create a new directory for your project
mkdir my-shopping-app && cd my-shopping-app

# Generate the example shopping assistant app
auto create:example shopping-assistant

# Navigate to the created project
cd shopping-assistant
pnpm install

# Export the flow schemas
auto export:schema ./.context ./flows

# Generate and implement the backend
auto generate:server .context/schema.json .
auto implement:server ./server

# Run backend validation
auto check:types ./server
auto check:tests ./server
auto check:lint ./server --fix

# Import design system and generate frontend
auto import:design-system ./.context WITH_COMPONENT_SETS ./shadcn-filter.ts
auto generate:ia ./.context ./flows/*.flow.ts
auto generate:client ./shadcn-starter ./client ./auto-ia.json ./schema.graphql ./figma-vars.json
auto implement:client ./client ./.context ./design-principles.md ./design-system.md

# Start the application
pnpm start
```

## 🎯 How It Works

<img width="100%" height="100%" alt="Screenshot 2025-07-23 at 9 20 03 PM" src="https://github.com/user-attachments/assets/50041682-2ec1-4148-a6d1-d51fe0680385" />

Auto automates the SDLC through a configurable pipeline of agentic and procedural modules. The process turns high-level models into production-ready code through these key stages:

1.  **Flow Modeling**: You (or an AI) start by creating a high-level ["Flow Model"](#-flow-models). This defines system behavior through command, query, and reaction "slices" that specify both frontend and backend requirements. This is where the core design work happens.
2.  **IA Generation**: An "information architect" agent automatically generates an information architecture schema from your model, similar to how a UX designer creates a wireframes.
3.  **Deterministic Scaffolding**: The IA schema is used to generate a complete, deterministic application scaffold.
4.  **Spec-Driven Precision**: The scaffold is populated with placeholders containing implementation hints and in-situ prompts. The initial flow model also generates deterministic tests. This combination of fine-grained prompts and tests precisely guides the AI.
5.  **AI Coding & Testing Loop**: An AI agent implements the code based on the prompts and context from previous steps. As code is written, tests are run. If they fail, the AI gets the error feedback and self-corrects, usually within 1-3 attempts.
6.  **Comprehensive Quality Checks**: After passing the tests, the code goes through further checks, including linting, runtime validation, and AI-powered visual testing to ensure design system compliance.

## 📋 CLI Commands

The Auto Engineer CLI provides a complete workflow for building applications:

### 🎯 Flow Development

- `create:example <name>` - Create example project (currently: shopping-assistant)
- `export:schema <context> <flows>` - Export flow schemas to context directory

### ⚙️ Backend Generation

- `generate:server <schema> <dest>` - Generate server from schema.json
- `implement:server <server-dir>` - AI implements server TODOs and tests
- `check:types <directory>` - Run TypeScript type checking
- `check:tests <directory>` - Run Vitest test suites
- `check:lint <directory> [--fix]` - Run ESLint with optional auto-fix

### 🎨 Design System & Frontend

- `import:design-system <src> <mode> [filter]` - Import Figma design system
- `generate:ia <context> <flows...>` - Generate Information Architecture
- `generate:client <starter> <client> <ia> <gql> [vars]` - Generate React client app
- `implement:client <client> <context> <principles> <design>` - AI implements client
- `check:client <client-dir>` - Run full frontend validation suite

Run `auto --help` for complete command documentation and examples.

## ✨ Features

- 🤖 AI-powered code generation with enterprise-grade architecture & security
- 📦 Domain-driven, slice-based design with built-in testing
- 🤝 Continuous AI & team collaboration
- 🎮 Fully MCP-driven (IDE, chat, custom AI control)
- 📚 Self-documenting
- 🔄 Continue far beyond day 0
- 🧪 Self-healing implementation with automatic error correction
- 🎨 Design system aware with Figma integration

## What Makes It Different

Auto Engineer generates well-architected, scalable applications with proper design patterns, robust external system integrations, and enterprise-grade security.

It achieves this through a combination of techniques:

- **Architecture as Code**: Engineers maintain full control of design decisions while AI operates within defined constraints, focusing on rapid code generation
- **Bulletproof Design Patterns**: Implements gateways and anti-corruption layers for robust external system integrations
- **Sliced Architecture**: Organizes code into domain-driven slices, ensuring low coupling and high cohesion between components
- **Specification by Example & BDD**: Ensures correct implementation from the start through clear specifications
- **Built-in Regression Testing**: Maintains system integrity by preventing breaking changes
- **Self-Documenting System**: Provides full transparency into human and AI decisions over time

## 🔄 Flow Models

Information Modeling is the act of expressing a system as interfaces, requests, commands, events, and state. The majority of systems lend themselves to be easily modeled using Flow Models. Flow Models define system behaviors through vertical slices, and bridges the gap between technical and non-technical stakeholders by providing a common language that:

- **Describes Complete Flows**: Captures entire user journeys and system interactions
- **Uses Vertical Slices**: Organizes functionality by domain-driven slices rather than technical layers
- **Enables Collaboration**: Allows technical, non-technical, and AI systems to work together
- **Specifies Behavior**: Defines both frontend and backend requirements in a single flow
- **Includes Validation Rules**: Embeds business rules and acceptance criteria directly in the flow

There are three types of slices in Flow Models:

1. Commands: tell the system to do something
2. Queries: get some data from the system
3. Reactions: define when > then scenarios

With these 3 basic building blocks, you can build the majority of information systems to power any kind of line-of-business application.

### Example Flow Model

```typescript
flow('Seasonal Assistant', () => {
  commandSlice('Suggest Shopping Items')
    .client(() => {
      specs('Assistant Chat Interface', () => {
        should('allow shopper to describe their shopping needs in natural language');
        should('provide a text input for entering criteria');
        should('show examples of what to include (age, interests, budget)');
        should('show a button to submit the criteria');
        should('generate a persisted session id for a visit');
        should('show the header on top of every page');
      });
    })
    .request(gql`
      mutation EnterShoppingCriteria($input: EnterShoppingCriteriaInput!) {
        enterShoppingCriteria(input: $input) {
          success
          error {
            type
            message
          }
        }
      }
    `)
    .server(() => {
      data([
        sink()
          .command('SuggestShoppingItems')
          .toIntegration(AI, 'DoChat', 'command')
          .withState(source().state('Products').fromIntegration(ProductCatalog))
          .additionalInstructions(
            'add this to the DoChat systemPrompt: use the PRODUCT_CATALOGUE_PRODUCTS MCP tool to get product data',
          ),
        sink().event('ShoppingItemsSuggested').toStream('shopping-session-${sessionId}'),
      ]);
      specs('When chat is triggered, AI suggests items based on product catalog', () => {
        given([
          State.Products({
            products: [
              {
                productId: 'prod-soccer-ball',
                name: 'Super Soccer Ball',
                price: 10,
                imageUrl: 'https://example.com/soccer-ball.jpg',
              },
              {
                productId: 'prod-craft-kit',
                name: 'Deluxe Craft Kit',
                price: 25,
                imageUrl: 'https://example.com/craft-kit.jpg',
              },
              {
                productId: 'prod-laptop-bag',
                name: 'Tech Laptop Backpack',
                price: 45,
                imageUrl: 'https://example.com/laptop-bag.jpg',
              },
              {
                productId: 'prod-mtg-starter',
                name: 'Magic the Gathering Starter Set',
                price: 30,
                imageUrl: 'https://example.com/mtg-starter.jpg',
              },
            ],
          }),
        ])
          .when(
            Commands.SuggestShoppingItems({
              sessionId: 'session-abc',
              prompt: 'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts.',
            }),
          )
          .then([
            Events.ShoppingItemsSuggested({
              sessionId: 'session-abc',
              suggestedItems: [
                {
                  productId: 'prod-soccer-ball',
                  name: 'Super Soccer Ball',
                  quantity: 1,
                  reason: 'Perfect for your daughter who loves soccer',
                },
                {
                  productId: 'prod-craft-kit',
                  name: 'Deluxe Craft Kit',
                  quantity: 1,
                  reason: 'Great for creative activities and crafts',
                },
              ],
            }),
          ]);
      });
    });

  reactSlice('finds items in product catalogue').server(() => {
    specs('When shopping criteria are entered, request wishlist creation', () => {
      when([
        Events.ShoppingItemsSuggested({
          sessionId: 'session-abc',
          suggestedItems: [
            {
              productId: 'prod-soccer-ball',
              name: 'Super Soccer Ball',
              quantity: 1,
              reason: 'Perfect for your daughter who loves soccer',
            },
            {
              productId: 'prod-craft-kit',
              name: 'Deluxe Craft Kit',
              quantity: 1,
              reason: 'Great for creative activities and crafts',
            },
          ],
        }),
      ]).then([
        Commands.AddItemsToCart({
          sessionId: 'session-abc',
          items: [
            {
              productId: 'prod-soccer-ball',
              name: 'Super Soccer Ball',
              quantity: 1,
              reason: 'Perfect for your daughter who loves soccer',
            },
            {
              productId: 'prod-craft-kit',
              name: 'Deluxe Craft Kit',
              quantity: 1,
              reason: 'Great for creative activities and crafts',
            },
          ],
        }),
      ]);
    });
  });

  querySlice('views suggested items')
    .client(() => {
      specs('Suggested Items Screen', () => {
        should('display all suggested items with names and reasons');
        should('show quantity selectors for each item');
        should('have an "Add to Cart" button for selected items');
        should('allow removing items from the suggestions');
      });
    })
    .request(gql`
      query GetSuggestedItems($sessionId: ID!) {
        suggestedItems(sessionId: $sessionId) {
          items {
            productId
            name
            quantity
            reason
          }
        }
      }
    `)
    .server(() => {
      data([source().state('SuggestedItems').fromProjection('SuggestedItemsProjection', 'sessionId')]);
      specs('Suggested items are available for viewing', () => {
        given([
          Events.ShoppingItemsSuggested({
            sessionId: 'session-abc',
            suggestedItems: [
              {
                productId: 'prod-soccer-ball',
                name: 'Super Soccer Ball',
                quantity: 1,
                reason: 'Perfect for your daughter who loves soccer',
              },
              {
                productId: 'prod-craft-kit',
                name: 'Deluxe Craft Kit',
                quantity: 1,
                reason: 'Great for creative activities and crafts',
              },
            ],
          }),
        ]).then([
          State.SuggestedItems({
            sessionId: 'session-abc',
            items: [
              {
                productId: 'prod-soccer-ball',
                name: 'Super Soccer Ball',
                quantity: 1,
                reason: 'Perfect for your daughter who loves soccer',
              },
              {
                productId: 'prod-craft-kit',
                name: 'Deluxe Craft Kit',
                quantity: 1,
                reason: 'Great for creative activities and crafts',
              },
            ],
          }),
        ]);
      });
    });
});
```

This approach enables:

- **Clear Architecture**: Each slice defines its own frontend and backend requirements
- **Traceable Requirements**: Rules and validations are explicitly defined
- **AI Understanding**: Structured format that AI systems can parse and implement
- **Living Documentation**: Flows serve as both specification and documentation

## 🏗️ Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/SamHatoum/auto-engineer
cd auto-engineer

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run all checks (lint, type-check, test)
pnpm check

# Link CLI for local development
cd packages/cli
pnpm link:dev
```

### Project Structure

```
auto-engineer/
├── packages/                     # Core packages
│   ├── cli/                      # CLI interface
│   ├── flowlang/                 # Flow modeling DSL
│   ├── message-bus/              # Event-driven messaging
│   ├── emmett-generator/         # Code generation
│   ├── ai-gateway/               # AI provider abstraction
│   ├── server-implementer/       # Backend implementation
│   ├── frontend-implementation/  # Frontend implementation
│   ├── backend-checks/           # Backend validation
│   └── ...
├── integrations/                 # External system integrations
├── examples/                     # Example projects
└── docs/                         # Documentation
```

## 🤝 Contributing

Join our [Discord community](https://discord.gg/B8BKcKMRm8) to connect with other developers, get help, and share your ideas!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following our commit message format:
   ```bash
   git commit -m "feat(scope): add amazing feature"
   ```
   > Note: For information about valid scopes, see the [Commit Message Guidelines](#-commit-message-guidelines) section below.
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Commit Message Guidelines

This project uses [commitlint](https://commitlint.js.org/) to enforce consistent commit messages across the monorepo.

### How it works

- **Scope enforcement:**  
  Commit messages must use a scope that matches a package or app directory (e.g. `apps/cli`), or the special `global` scope for changes affecting the whole repo.
- **Configuration:**  
  The rules are defined in `commitlint.config.ts` at the repo root. Scopes are dynamically generated from the current package and app directories.
- **Global scope:**  
  Use the `global` scope for changes that are not specific to a single package or app.

### Example commands and commit messages

```bash
git commit -m "feat(packages/message-bus): add new feature"
git commit -m "fix(apps/cli): correct CLI argument parsing"
git commit -m "chore(global): update repository settings"
```

## 🔍 Debug Logging

Auto Engineer uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging across all packages. This provides detailed insights into the internal operations without cluttering normal output.

### Quick Start

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all debug output
DEBUG=* auto create:example shopping-assistant

# Enable specific package
DEBUG=flowlang:* pnpm dev

# Enable multiple packages
DEBUG=flowlang:*,message-bus:*,ia:* pnpm dev

# Save debug output to file
DEBUG=* pnpm dev 2> debug.log
```

### Available Debug Namespaces

Each package has its own set of debug namespaces. Here's an overview with links to detailed documentation:

| Package                     | Main Namespaces                                                    | Documentation                                             |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| **message-bus**             | `message-bus:*`, `message-bus:command`, `message-bus:event`        | [📖 Details](./packages/message-bus/DEBUG.md)             |
| **flowlang**                | `flowlang:*`, `flowlang:flow`, `flowlang:fluent-builder:*`         | [📖 Details](./packages/flowlang/DEBUG.md)                |
| **information-architect**   | `ia:*`, `ia:generate-command:*`                                    | [📖 Details](./packages/information-architect/DEBUG.md)   |
| **emmett-generator**        | `emmett:*`, `emmett:scaffolding:*`, `emmett:extract:*`             | [📖 Details](./packages/emmett-generator/DEBUG.md)        |
| **server-implementer**      | `server-impl:*`, `server-impl:flows:*`                             | [📖 Details](./packages/server-implementer/DEBUG.md)      |
| **frontend-implementation** | `frontend-impl:*`, `frontend-impl:agent:*`                         | [📖 Details](./packages/frontend-implementation/DEBUG.md) |
| **design-system-importer**  | `design-importer:*`, `design-importer:builder:*`                   | [📖 Details](./packages/design-system-importer/DEBUG.md)  |
| **ai-gateway**              | `ai-gateway:*`, `ai-gateway:call`, `ai-gateway:error`              | [📖 Details](./packages/ai-gateway/DEBUG.md)              |
| **react-graphql-generator** | `react-gql:*`, `react-gql:schema`, `react-gql:components`          | [📖 Details](./packages/react-graphql-generator/DEBUG.md) |
| **backend-checks**          | `backend-checks:*`, `backend-checks:types`, `backend-checks:tests` | Backend validation and checking                           |

### Common Debug Scenarios

#### Debug Full Pipeline

```bash
# Debug complete generation pipeline
DEBUG=* auto create:example shopping-assistant
```

#### Debug Flow Processing

```bash
# Debug flow creation and processing
DEBUG=flowlang:*,emmett:scaffolding:* auto generate:server .context/schema.json .
```

#### Debug AI Operations

```bash
# Debug AI calls and error handling
DEBUG=ai-gateway:*,frontend-impl:agent:ai,ia:* auto implement:client ./client ./.context
```

#### Debug Server Implementation

```bash
# Debug server generation and implementation
DEBUG=server-impl:*,emmett:* auto implement:server ./server
```

#### Debug Frontend Generation

```bash
# Debug frontend and GraphQL generation
DEBUG=frontend-impl:*,react-gql:* auto generate:client
```

### Tips and Tricks

1. **Start Broad, Then Narrow**: Begin with `DEBUG=*` to see everything, then focus on specific namespaces
2. **Use Wildcards**: `DEBUG=*:command` shows all command-related logs across packages
3. **Combine Namespaces**: Use commas to combine multiple patterns: `DEBUG=flowlang:*,message-bus:*`
4. **Exclude Patterns**: Use `-` to exclude verbose output: `DEBUG=*,-express:*`
5. **Save to File**: Redirect stderr to a file: `DEBUG=* auto implement:server 2> debug.log`
6. **Filter Output**: Pipe through grep: `DEBUG=* auto implement:server 2>&1 | grep ERROR`
7. **Add Timestamps**: Use the `ts` utility: `DEBUG=* auto implement:server 2>&1 | ts`
8. **Disable Colors**: Set `DEBUG_COLORS=false` for plain text output

### Environment Variables

Additional debug-related environment variables:

- `DEBUG` - Enables debug output for specified namespaces
- `DEBUG_COLORS` - Set to `false` to disable colored output
- `DEBUG_DEPTH` - Set maximum depth for object inspection
- `DEBUG_SHOW_HIDDEN` - Show hidden properties in object output

## 📦 Versioning & Releases

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing packages.

> **⚠️ Important:**
>
> - Do **not** run `changeset version` or `changeset publish` locally or push version bumps directly to `main`.
> - Always use Pull Requests and let the GitHub Action create and merge the release PR. This ensures correct versioning, publishing, and tagging of only the changed packages.
> - If you bypass this flow, tags and changelogs may not be generated correctly.

### How it works

1. **Create a Changeset:**
   - Run `pnpm changeset` and follow the prompts to describe your changes. This creates a markdown file in the `.changeset/` directory.
2. **Commit the Changeset:**
   - Commit the changeset file along with your code changes.
3. **Open a Pull Request:**
   - When your PR is merged to `main`, a GitHub Action will automatically create or update a release PR with version bumps and changelogs.
4. **Release:**
   - When the release PR is merged, the CI pipeline will:
     - Build and test all packages.
     - Publish updated packages to npm if all checks pass.

### Commands

- `pnpm changeset` – Start a new changeset
- `pnpm release` – Publish packages (run by CI)

### Automation

- Publishing is fully automated via GitHub Actions. Manual publishing is not required.

### Changelogs

- Each package maintains its own changelog in `CHANGELOG.md`
- Changelogs are automatically generated from changesets
- Changes are categorized by type (feat, fix, chore, etc.)
- Each entry includes the PR number and author for traceability

## 📝 License

This project is licensed under the Elastic License 2.0 - see the [LICENSE](LICENSE) file for details.
