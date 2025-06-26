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

##### _NOTE THIS IS AN EARLY PREVIEW OF THE FUNCTIONALITY - WE ARE DOING README-DRIVEN-DEVELOPMENT AND WORKING HARD ON MAKING IT HAPPEN_
Stay up to date by watching 👀☝️ and giving us a star ⭐☝️

## 🎯 How It Works

<img width="1193" alt="Screenshot 2025-06-25 at 7 21 36 PM" src="https://github.com/user-attachments/assets/38cfae52-e530-4a13-9baa-c7691a086e01" />

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
import { commandSlice, querySlice, reactSlice, flow, createBuilders, should, when, specs, gql } from '@auto-engineer/flow-lang';

import type { ListingCreated } from './slices/create-listing/events';
import type { BookingRequested } from './slices/guest-submits-booking-request/events';
import type { HostNotified } from './slices/host-manages-booking-request/events';
import type { PropertyRemoved } from './slices/remove-property/events';
import type { CreateListing } from './slices/create-listing/commands';
import type { RequestBooking } from './slices/guest-submits-booking-request/commands';
import type { NotifyHost } from './slices/host-manages-booking-request/commands';
import type { RemoveProperty } from './slices/remove-property/commands';
import type { AvailableProperty } from './shared/read-model';

import { MailChimp } from '@auto-engineer/mailchimp-integration';
import { Twilio } from '@auto-engineer/twilio-integration';

const { Events, Commands, State } = createBuilders()
  .events<ListingCreated | BookingRequested | HostNotified | PropertyRemoved>()
  .commands<CreateListing | RequestBooking | NotifyHost | RemoveProperty>()
  .state<{ AvailableProperties: AvailableProperty }>();


flow('Host creates a listing', () => {

  commandSlice('Create listing')
    .stream('listing-${id}')
    .client(() => {
      specs('A form that allows hosts to create a listing',() => {
        should('have fields for title, description, location, address')
        should('have price per night input')
        should('have max guests selector')
        should('have amenities checklist')
        should.not('be shown to guest users')
      });
    })
    .server(() => {
      specs('Host can create a new listing', () => {
        when(
          Commands.CreateListing({
            propertyId: "listing_123",
            hostId: "host_456",
            location: "San Francisco",
            address: "123 Market St",
            title: "Modern Downtown Apartment",
            description: "Beautiful apartment with city views",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen", "parking"]
          })).then([
            Events.ListingCreated({
              propertyId: "listing_123",
              hostId: "host_456",
              location: "San Francisco",
              address: "123 Market St",
              title: "Modern Downtown Apartment",
              description: "Beautiful apartment with city views",
              pricePerNight: 250,
              maxGuests: 4,
              amenities: ["wifi", "kitchen", "parking"],
              listedAt: new Date("2024-01-15T10:00:00Z")
            })
          ]);
      });
    });

});

flow('Guest books a listing', () => {

  querySlice('Search for available listings')
    .client(() => {
      specs('Listing Search Screen', () => {
        should('have location filter')
        should('have price range slider')
        should('have guest count filter')
      });
    })
    .request(gql`
      query SearchListings($location: String, $maxPrice: Float, $minGuests: Int) {
        searchListings(location: $location, maxPrice: $maxPrice, minGuests: $minGuests) {
          propertyId
          title
          location
          pricePerNight
          maxGuests
        }
      }`
    )
    .server(() => {
      specs('Listing becomes searchable after being created', () => {
        when(
          Events.ListingCreated({
            propertyId: "listing_123",
            hostId: "host_456",
            location: "San Francisco",
            address: "123 Market St",
            title: "Modern Downtown Apartment",
            description: "Beautiful apartment with city views",
            pricePerNight: 250,
            maxGuests: 4,
            amenities: ["wifi", "kitchen", "parking"],
            listedAt: new Date("2024-01-15T10:00:00Z")
          })
        ).then([
          State.AvailableProperties({
            propertyId: "listing_123",
            title: "Modern Downtown Apartment",
            location: "San Francisco",
            pricePerNight: 250,
            maxGuests: 4
          })
        ]);
      });
    });

  reactSlice('Host is notified')
    .server(() => {
      specs('Host is notified when booking request is received',() => {
        when([
          Events.BookingRequested({
            bookingId: "booking_456",
            propertyId: "listing_123",
            hostId: "host_456",
            guestId: "guest_789",
            checkIn: "2024-02-01",
            checkOut: "2024-02-05",
            guests: 2,
            message: "Looking forward to our stay!",
            status: "pending_host_approval",
            requestedAt: "2024-01-15T14:30:00Z",
            expiresAt: "2024-01-16T14:30:00Z"
          })
        ]).then([
          Commands.NotifyHost({
            hostId: "host_456",
            notificationType: "booking_request",
            priority: "high",
            channels: ["email", "sms"],
            message: "Looking forward to our stay!",
            actionRequired: true
          })
        ]);
      });
    });

  commandSlice('Notify host')
    .via([MailChimp, Twilio])
    .retries(3)
    .server(() => {
      specs('Send notification using the specified integrations', () => {
        when(
          Commands.NotifyHost({
            hostId: "host_456",
            notificationType: "booking_request",
            priority: "high",
            channels: ["email", "sms"],
            message: "Looking forward to our stay!",
            actionRequired: true
          })).then([
            Events.HostNotified({
              bookingId: "booking_456",
              hostId: "host_456",
              notificationType: "booking_request",
              channels: ["email", "sms"],
              notifiedAt: "2024-01-15T14:30:00Z"
            })
          ]);
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
