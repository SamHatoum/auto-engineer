# Auto Engineer Documentation

Auto Engineer puts your SDLC on auto, helping you build production-grade apps with humans and agents.

## Overview

Auto Engineer is a tool designed to automate the Software Development Life Cycle (SDLC) by enabling developers to build production-grade applications using a combination of human input and AI-driven agents. It leverages a plugin-based architecture to generate and implement code for both server and frontend components, streamlining the development process from high-level flow modeling to quality-checked production code.

### Key Features

- **Flow Modeling**: Define system behavior using a domain-specific language (DSL) for commands, queries, and reactions.
- **AI-Driven Implementation**: Automate code generation and implementation with AI agents guided by schemas and tests.
- **Plugin System**: Modular architecture allows developers to install only the plugins needed for their use case.
- **Event-Driven Architecture**: Supports loosely coupled components communicating via events.
- **Comprehensive Validation**: Includes type checking, linting, and AI-powered visual testing to ensure code quality.

Auto Engineer is in early preview and is actively being tested with real-world clients and use cases. Developers can stay updated by joining the Discord community or starring the repository on GitHub.

## Features

Auto Engineer provides a set of tools to automate and streamline the Software Development Life Cycle (SDLC). Below are its core features:

- **Flow Modeling DSL**: Define application behavior using a type-safe, high-level flow model that specifies both frontend and server requirements.
- **Information Architecture Generation**: Automatically generate information architecture schemas to guide application scaffolding.
- **Deterministic Scaffolding**: Produce complete application scaffolds from flow models, including placeholders with implementation hints.
- **AI-Powered Code Implementation**: Use AI agents to implement server and frontend code, guided by precise prompts and deterministic tests.
- **Comprehensive Validation**: Run type checking, linting, test suites, and AI-powered visual testing to ensure production-ready code.
- **Modular Plugin System**: Install only the plugins needed for specific functionality, such as server generation or frontend scaffolding.
- **Event-Driven Message Bus**: Monitor commands and events in real-time via a web dashboard at `http://localhost:5555`.
- **TypeScript Support**: Full TypeScript integration with strict typing for robust development.
- **File Synchronization**: Automatic file watching and syncing for efficient development workflows.

For a detailed explanation of how these features work together, see the Auto Engineer Pipeline.

## Roadmap
