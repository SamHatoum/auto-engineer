[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg)](https://www.elastic.co/licensing/elastic-license)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange)](https://turbo.build/repo)

# Auto Engineer

> Build production-grade applications with AI assistance. Not just another prototype tool.

## ✨ Features

- 🤖 AI-powered code generation with best practices
- 🏗️ Enterprise-grade architecture and security
- 🔄 Continuous collaboration between AI and team
- 📦 Domain-driven design with vertical slices
- 🧪 Built-in testing and validation
- 📚 Self-documenting system
- 🎮 Fully MCP-driven for IDE, chat, and custom AI control

## 🎯 How It Works

1. ✍️ Enter a prompt describing your application
2. 🤝 Collaborate with the AI and your team
3. 🏗️ AI builds the app with best practices
4. 🔄 Iterate beyond day 0

## What Makes It Different

Auto Engineer generates well-architected, scalable applications with proper design patterns, robust external system integrations, and enterprise-grade security.

It achieves this through a combination of techniques:

* **Architecture as Code**: Engineers maintain full control of design decisions while AI operates within defined constraints, focusing on rapid code generation
* **Bulletproof Design Patterns**: Implements gateways and anti-corruption layers for robust external system integrations
* **Sliced Architecture**: Organizes code into domain-driven slices, ensuring low coupling and high cohesion between components
* **Specification by Example & BDD**: Ensures correct implementation from the start through clear specifications
* **Built-in Regression Testing**: Maintains system integrity by preventing breaking changes
* **Self-Documenting System**: Provides full transparency into human and AI decisions over time

## 🔄 FlowLang

FlowLang is a declarative language for defining system behaviors through vertical slices. It bridges the gap between technical and non-technical stakeholders by providing a common language that:

* **Describes Complete Flows**: Captures entire user journeys and system interactions
* **Uses Vertical Slices**: Organizes functionality by domain-driven slices rather than technical layers
* **Enables Collaboration**: Allows technical, non-technical, and AI systems to work together
* **Specifies Behavior**: Defines both frontend and backend requirements in a single flow
* **Includes Validation Rules**: Embeds business rules and acceptance criteria directly in the flow

### Example Flow

```yml
Flow: Guest Books a Property
  Slice: Guest searches for available properties
    Frontend: Search Interface
      A clean search interface with location input, date pickers, and guest counter.
      
      Rule: Search Form Validation  
        Should require check-in and check-out dates  
        Should validate dates are in the future  

    Backend: Property Search  
      Executes a search against the property index using the guest's criteria.  
      
      Rule: Search shows available properties
        Example: Search by default parameters
          Given PropertyAddeded
          ```json
          {
            "propertyId": "prop_123",
            "location": "San Francisco",
            "pricePerNight": 250,
            "maxGuests": 4,
            "amenities": ["WiFi", "Kitchen", "Parking"],
            "bookedDates": []
          }
          ```
          When SearchPropertiesQuery
          ```json
          {
            "location": "San Francisco",
            "checkIn": "2025-07-15",
            "checkOut": "2025-07-18",
            "guests": 2,
            "priceMax": 300
          }
          ```
          Then SearchResults
          ```json
          {
            "searchId": "search_abc123",
            "resultsCount": 47,
            "topResults": ["prop_123"],
            "averagePrice": 225.00
          }
          ```
```

This approach enables:
* **Clear Architecture**: Each slice defines its own frontend and backend requirements
* **Traceable Requirements**: Rules and validations are explicitly defined
* **AI Understanding**: Structured format that AI systems can parse and implement
* **Living Documentation**: Flows serve as both specification and documentation

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
```

## 🤝 Contributing

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
git commit -m "feat(packages/flowlang-modeling-agent): add new feature"
git commit -m "fix(apps/cli): correct CLI argument parsing"
git commit -m "chore(global): update repository settings"
```

## 📦 Versioning & Releases

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing packages.

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
