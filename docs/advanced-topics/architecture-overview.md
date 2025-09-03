# Architecture Overview

Auto Engineer follows a modular, command/event-driven architecture designed for flexibility and scalability. Below are the key architectural principles:

- **Plugin-Based Design**: Functionality is provided through modular plugins, allowing developers to install only the components needed for their project.
- **Command Pattern**: All operations are implemented as commands, enabling composability and extensibility.
- **Event-Driven Communication**: Components communicate via a loosely coupled event system, supported by a built-in message bus server.
- **Type-Safe Development**: Full TypeScript support with strict typing ensures robust code throughout the system.

## Monorepo Structure

Auto Engineer is organized as a monorepo using Turborepo, with the following key directories:

- **packages/**: Contains core plugins, such as CLI, flow modeling, server and frontend generation, and validation tools.
- **integrations/**: Includes integrations for AI providers, cart services, and product catalogs.
- **examples/**: Provides example projects, such as a cart API and product catalog API.

For a detailed list of plugins, see CLI Guide. To set up a local development environment, see Development Setup.
