# Auto Engineer Documentation

Auto Engineer puts your SDLC on auto, helping you build **production-grade applications** with the power of **humans + AI-driven agents**.

## Overview

Auto Engineer is a tool that automates the **Software Development Life Cycle (SDLC)** by combining developer input with _AI-powered agents_.

It lets you:

- Define **high-level system behavior** using models.
- Automatically **generate, scaffold, and implement code**.
- Build robust frontend and backend components faster.
- Streamline the entire workflow from **design to production**.

Its **plugin-based architecture** means you install only the components you need.

> ⚡ Currently in **early preview**. Join our [Discord](https://discord.gg/B8BKcKMRm8) or star the repo on [GitHub](https://github.com/SamHatoum/auto-engineer) to stay updated.

## Core Concepts

Auto Engineer is built around three core primitives—**flows**, **commands**, and **events**. Together, they let you describe _what_ an app should do, while AI-powered plugins handle _how_ it’s implemented.

- **Flows**
  - **Purpose**: Define high-level business processes (e.g. _"user places an order"_).
  - **Structure**: A sequence of slices combining commands, events, and states.
  - **Example**: Shopping cart flow → `AddItemToCart` (command) → `ItemAddedToCart` (event) → cart state updated.
  - **Definition**: Written in TypeScript under `flows/`, validated at build time, and converted into schemas for code generation.

- **Commands**
  - **Purpose**: Represent actions or intents, either user-driven or system-driven.
  - **Data**: Include payloads needed to execute the action (e.g. `{ productId: "123", quantity: 2 }`).
  - **Processing**: Handled by command handlers, which enforce business rules and typically emit events.
  - **Properties**: Type-safe, schema-defined, versioned for evolution.

- **Events**
  - **Purpose**: Record outcomes of commands or other activities.
  - **Nature**: Immutable, type-safe, and versioned.
  - **Usage**: Update application state or trigger additional processes.
  - **Delivery**: Published on a message bus so other services can subscribe (e.g. a payment service listening to `OrderPlaced`).

Together, these primitives separate **intent** (commands), **outcome** (events), **context** (states), and **process** (flows).

## Features

Auto Engineer provides a toolkit for automating modern application development.  
Its features span from modeling to implementation and monitoring.

### Core Capabilities

- **Flow Modeling DSL**: Define application behavior with a type-safe DSL that maps directly to commands, events, and state transitions.
- **Deterministic Scaffolding**: Produce predictable project scaffolds from flow definitions, ensuring consistent structure across services and clients.
- **Information Architecture Generation**: Automatically generate schemas, projections, and resolvers from flow specifications.
- **AI-Powered Code Implementation**: Use AI agents to generate and implement both server and frontend code, guided by your flow models and schemas.
- **Event-Driven Architecture**: Build loosely coupled services that communicate via a message bus. Commands trigger events, and events update state or trigger additional logic.
- **Validation and Quality Checks**: Includes type checking, linting, automated tests, and AI-assisted visual validation. Validation runs through plugins like `server-checks` and `frontend-checks`.
- **Modular Plugin System**: Install only the plugins you need (e.g. `server-generator-apollo-emmett`, `frontend-implementer`, `design-system-importer`).
- **Real-Time Monitoring**: Observe commands, events, and state changes live through a web dashboard (`http://localhost:5555`).
- **TypeScript First**: All flows, commands, events, and states are schema-driven and strongly typed for safer development.
- **File Synchronization**: A background file-sync service watches your project, regenerates artifacts, and keeps generated code in sync as flows evolve.

> 💡 For deep dives into these capabilities, see the **Guides** and **Core Concepts** sections.

## Roadmap

Auto Engineer is evolving rapidly. Our near-term focus includes:

TBA

Stay tuned for updates via the [changelog](../CHANGELOG.md).
