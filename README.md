[![Discord Online](https://img.shields.io/discord/1336421551255457846?label=Online&logo=discord)](https://discord.gg/rXR4ngqW)
[![Discord Users](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FrXR4ngqW%3Fwith_counts%3Dtrue&query=%24.approximate_member_count&logo=discord&logoColor=white&label=Total&color=brightgreen&style=flat)](https://discord.gg/rXR4ngqW)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange)](https://pnpm.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange)](https://turbo.build/repo)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg)](https://www.elastic.co/licensing/elastic-license)

# Auto Engineer

> Put your SDLC on Auto, and build production-grade apps with agents.

##### _EARLY PREVIEW_

- We are working hard on making it happen
- We are actively using Auto with real-world clients and use-cases
- We are making a lot of design decisions as we battle test the approach

Stay up to date by watching 👀☝️ and giving us a star ⭐☝️ - join the Discord for conversations.

## Try it now

Note: The developer experience will change significantly as we work with customers and users.

```bash
# optional: start the example existing services and sites
pnpm start:examples

# add your *ANTHROPIC_API_KEY* to the .env file
pnpm i && pnpm generate:all

# A shopping-assistant dir will be created one level above auto-engineer.
# You should open this as a separate project in your IDE
cd ../shopping-assistant && pnpm start
```

You can now navigate and play with the locally running UI and graphql servers.

## 🎯 How It Works

<img width="100%" height="100%" alt="Screenshot 2025-07-23 at 9 20 03 PM" src="https://github.com/user-attachments/assets/50041682-2ec1-4148-a6d1-d51fe0680385" />

Auto automates the SDLC through a configurable pipeline of agentic and procedural modules. The process turns high-level models into production-ready code through these key stages:

1.  **Flow Modeling**: You (or an AI) start by creating a high-level "Flow Model". This defines system behavior through command, query, and reaction "slices" that specify both frontend and backend requirements. This is where the core design work happens.
2.  **IA Generation**: An "information architect" agent automatically generates an information architecture schema from your model, similar to how a UX designer creates a wireframes.
3.  **Deterministic Scaffolding**: The IA schema is used to generate a complete, deterministic application scaffold.
4.  **Prompt-Driven Implementation**: The scaffold is populated with placeholders containing implementation hints and in-situ prompts. The initial flow model also generates deterministic tests. This combination of fine-grained prompts and tests precisely guides the AI.
5.  **AI Coding & Testing Loop**: An AI agent implements the code based on the prompts and context from previous steps. As code is written, tests are run. If they fail, the AI gets the error feedback and self-corrects, usually within 1-3 attempts.
6.  **Comprehensive Quality Checks**: After passing the tests, the code goes through further checks, including linting, runtime validation, and AI-powered visual testing to ensure design system compliance.

## ✨ Features

- 🤖 AI-powered code generation with enterprise-grade architecture & security
- 📦 Domain-driven, slice-based design with built-in testing
- 🤝 Continuous AI & team collaboration
- 🎮 Fully MCP-driven (IDE, chat, custom AI control)
- 📚 Self-documenting
- 🔄 Continue far beyond day 0

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
  commandSlice('Suggest Shopping Items').server(() => {
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
    .client(() => {
      specs('Suggested Items Screen', () => {
        should('display all suggested items with names and reasons');
        should('show quantity selectors for each item');
        should('have an "Add to Cart" button for selected items');
        should('allow removing items from the suggestions');
      });
    })
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

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.15.4

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run all checks
pnpm check
```

## 🤝 Contributing

Join our [Discord community](https://discord.gg/rXR4ngqW) to connect with other developers, get help, and share your ideas!

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
