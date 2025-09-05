# Auto Engineer Documentation

Auto Engineer puts your SDLC on auto, helping you build **production-grade applications** with the power of **humans + AI-driven agents**.

## Overview

Auto Engineer is a developer tool designed to **automate the Software Development Life Cycle (SDLC)** by combining human input with **AI-powered agents**.

It enables developers to:

- Define **high-level system behavior** using models.
- Automatically **generate, scaffold, and implement code**.
- Build robust frontend and backend components faster.
- Streamline the entire workflow from **design to production**.

By leveraging a **plugin-based architecture**, Auto Engineer adapts to different projects, enabling you to install only the components you need.

> ⚡ Currently in **early preview**. Join our [Discord](https://discord.gg/B8BKcKMRm8) or star the repo on [GitHub](https://github.com/SamHatoum/auto-engineer) to stay updated.

## Core Concepts

Auto Engineer is built around a few key primitives—flows, commands, and events—that work together to define and automate application logic in a modular, scalable way. These concepts enable developers to describe "what" an app should do, while AI-powered plugins handle "how" it's implemented.

- Flows: A flow is a high-level description of a business process, like "user places an order" or "host creates a listing." It’s a sequence of steps (or "slices") that combines commands, events, and states to model how the app behaves. For example, a shopping cart flow might include a command to add an item, an event confirming the addition, and a state tracking the cart’s contents. Flows are defined in TypeScript files (e.g., in the flows/ directory) and serve as blueprints for generating code.
- Commands: Commands are actions that trigger changes in the application, like "AddItemToCart" or "CreateListing." They represent user or system intents and carry data needed to perform the action (e.g., `{ productId: "123", quantity: 2 })`. Commands are type-safe, defined in message schemas, and processed by a command handler that decides what happens next, often producing events. Think of commands as instructions the app executes.
- Events: Events are records of things that have happened, like "ItemAddedToCart" or "ListingCreated." They capture the outcome of a command or other system activity and are used to update the application’s state or trigger further actions. Events are immutable, type-safe, and sent via a message bus, enabling loose coupling (e.g., a payment service reacting to "OrderPlaced"). They’re defined alongside commands in message schemas.

## Features

Auto Engineer provides a **comprehensive toolkit** for automating modern application development.

### Core Capabilities

- **Flow Modeling DSL** – Define app behavior using a type-safe, high-level modeling language.
- **AI-Powered Code Implementation** – Generate server and frontend code using intelligent AI agents.
- **Deterministic Scaffolding** – Produce complete, predictable application scaffolds from your flow models.
- **Information Architecture Generation** – Automatically create schemas and structure for your app.
- **Event-Driven Architecture** – Build loosely coupled components communicating via events.
- **Comprehensive Validation** – Includes type checking, linting, automated tests, and AI-powered visual validation.
- **Modular Plugin System** – Install only what you need (e.g., server, frontend, integrations).
- **Real-Time Monitoring** – Watch commands and events live via a web dashboard at `http://localhost:5555`.
- **TypeScript First** – Fully integrated with strict typing for safer, more robust development.
- **File Synchronization** – Automatically watch, sync, and regenerate files as you iterate.

> 💡 For deep-dives into these features, see the **Guides** and **Core Concepts** sections.

## Roadmap

Auto Engineer is evolving rapidly. Our near-term focus includes:

... TBA

Stay tuned for updates via the [changelog](../CHANGELOG.md).
