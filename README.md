[![Discord Online](https://img.shields.io/discord/1336421551255457846?label=Online&logo=discord)](https://discord.gg/2K4hK9EX)
[![Discord Users](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2F2K4hK9EX%3Fwith_counts%3Dtrue&query=%24.approximate_member_count&logo=discord&logoColor=white&label=Total&color=brightgreen&style=flat)](https://discord.gg/2K4hK9EX)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange)](https://pnpm.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange)](https://turbo.build/repo)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg)](https://www.elastic.co/licensing/elastic-license)

# Auto Engineer

> Build production-grade applications with AI assistance. Not just another prototype tool.

## 🎯 How It Works

```console
🤖 auto: what would you like to build?
👤 user: airbnb clone

🤖 auto: crafting a FlowModel for exploration & collaboration
🤖 auto: building your PropertyBooking flow...

🔀 Flow: PropertyBooking
├── Slice: Search properties  
│    ├── queries: search, filter, sort
│    ├── projections: availability index
│    └── specs: filters, search behavior
├── Slice: Book property 
│    ├── commands: RequestBooking
│    ├── events: BookingConfirmed
│    └── specs: booking rules
├── Slice: Notify host of bookings
│    ├── reactions: notifications
│    └── specs: notifications rules
└── Integrations
     ├── Auth0 (authentication)
     └── Google Maps (locations)

✓ Generated 1 command handler, 1 query
✓ Built React components with specs
✓ Configured integrations
✓ All tests passing

your app is ready at: http://localhost:3000 🚀
visualize your flow here: http://localhost:5000 🔍

🤖 auto: what would you like to iterate on?
👤 user: add user reviews

🤖 auto: extending PropertyBooking flow...

🔀 Flow: PropertyBooking 
├── Slice: Submit review
│    ├── commands: SubmitReview
│    ├── events: ReviewSubmitted
│    └── specs: only past guests, one per stay
└── [+] Slice: View reviews
     ├── queries: GetPropertyReviews, GetUserReviews
     ├── projections: ratings, review feed
     └── specs: sorting, filtering, pagination

✓ Generated 1 command handler, 1 query
✓ Built React components with specs
✓ Configured integrations
✓ All tests passing

your app is ready at: http://localhost:3000 🚀
visualize your flow here: http://localhost:5000 🔍

👤 user: █
```

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

* **Architecture as Code**: Engineers maintain full control of design decisions while AI operates within defined constraints, focusing on rapid code generation
* **Bulletproof Design Patterns**: Implements gateways and anti-corruption layers for robust external system integrations
* **Sliced Architecture**: Organizes code into domain-driven slices, ensuring low coupling and high cohesion between components
* **Specification by Example & BDD**: Ensures correct implementation from the start through clear specifications
* **Built-in Regression Testing**: Maintains system integrity by preventing breaking changes
* **Self-Documenting System**: Provides full transparency into human and AI decisions over time

## 🔄 FlowModels

Information Flow Modeling is the act of expressing a system as interfaces, commands, queries, events, and state. The majority of systems lend themselves to be easily modeled using Flow Models. Flow Models define system behaviors through vertical slices, and bridges the gap between technical and non-technical stakeholders by providing a common language that:

* **Describes Complete Flows**: Captures entire user journeys and system interactions
* **Uses Vertical Slices**: Organizes functionality by domain-driven slices rather than technical layers
* **Enables Collaboration**: Allows technical, non-technical, and AI systems to work together
* **Specifies Behavior**: Defines both frontend and backend requirements in a single flow
* **Includes Validation Rules**: Embeds business rules and acceptance criteria directly in the flow

### Example Flow Model

```typescript
flow('PropertyBooking', () => {

  slice.command('List property', () => {

    frontend('A form that allows hosts to list a property', () => {
      specs(() => {
        should('have fields for title, description, location, address')
        should('have price per night input')
        should('have max guests selector')
        should('have amenities checklist')
      });
    });

    backend('List property', () => {

      scenario('Host can lists a new property', () => {

        when<ListProperty>({
          type: "ListProperty",
          data: {
            propertyId: "property_123",
            hostId: "host_456",
            location: "San Francisco",
            address: "123 Market St",
            title: "Modern Downtown Apartment",
            description: "Beautiful apartment with city views",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen", "parking"]
          }
        })
        .then<PropertyListed>([{
          type: "PropertyListed",
          data: {
            propertyId: "property_123",
            hostId: "host_456",
            location: "San Francisco",
            address: "123 Market St",
            title: "Modern Downtown Apartment",
            description: "Beautiful apartment with city views",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen", "parking"],
            listedAt: new Date("2024-01-15T10:00:00Z")
          }
        }]);
      });
    });
  });

  slice.query('Search for available properties', () => {

    frontend('Property Search', () => {
      specs(() => {
        should('have location filter')
        should('have price range slider')
        should('have guest count filter')
        should('show property cards with images')
      });
    });

    backend('Property search projection', () => {

      scenario('Property becomes available after being listed', () => {

        given<PropertyListed>([
          {
            type: "PropertyListed",
            data: {
              propertyId: "property_123",
              hostId: "host_456",
              location: "San Francisco",
              address: "123 Market St",
              title: "Modern Downtown Apartment",
              description: "Beautiful apartment with city views",
              pricePerNight: 250,
              maxGuests: 4,
              amenities: ["wifi", "kitchen", "parking"],
              listedAt: new Date("2024-01-15T10:00:00Z")
            }
          }
        ])
        .then<AvailableProperty>({
          propertyId: "property_123",
          title: "Modern Downtown Apartment",
          location: "San Francisco",
          pricePerNight: 250,
          maxGuests: 4
        });
      });
    });
  });

  slice.reaction('When booking request is received, notify host', () => {

    backend('Notify host of booking request', () => {

      scenario('Host is notified when booking request is received', () => {

        given<BookingRequested>([
          {
            type: "BookingRequested",
            data: {
              hostId: "host_456",
              bookingId: "booking_456",
              propertyId: "property_123",
              guestId: "guest_789",
              checkIn: "2024-02-01",
              checkOut: "2024-02-05",
              guests: 2,
              message: "Looking forward to our stay!",
              status: "pending_host_approval",
              requestedAt: "2024-01-15T14:30:00Z",
              expiresAt: "2024-01-16T14:30:00Z"
            }
          }
        ])
        .then<HostNotified>([{
          type: "HostNotified",
          data: {
            bookingId: "booking_456",
            hostId: "host_456",
            notificationType: "booking_request",
            channels: ["email", "push"],
            notifiedAt: "2024-01-15T14:30:00Z"
          }
        }]);
      });
    });
  });

  slice.command('Notify host', () => {

    backend('Notify host', () => {

      uses(MailChimp).hints("be sure to use the new v2 api")

      scenario('Host is notified when booking request is received', () => {

        when<NotifyHost>({
          type: "NotifyHost",
          data: {
            hostId: "host_456",
            notificationType: "booking_request",
            priority: "high",
            channels: ["email", "push"],
            message: "Looking forward to our stay!",
            actionRequired: true
          }
        })
        .then<HostNotified>([{
          type: "HostNotified",
          data: {
            bookingId: "booking_456",
            hostId: "host_456",
            notificationType: "booking_request",
            channels: ["email", "push"],
            notifiedAt: "2024-01-15T14:30:00Z"
          }
        }]);
      });
    });
  });
});
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

Join our [Discord community](https://discord.gg/2K4hK9EX) to connect with other developers, get help, and share your ideas!

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
git commit -m "feat(packages/flow-modeling-agent): add new feature"
git commit -m "fix(apps/cli): correct CLI argument parsing"
git commit -m "chore(global): update repository settings"
```

## 📦 Versioning & Releases

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing packages.

> **⚠️ Important:**
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
