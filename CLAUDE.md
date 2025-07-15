# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Auto Engineer is a TypeScript monorepo that builds production-grade applications with AI assistance using Information Flow Modeling. The core concept is expressing systems as interfaces, commands, queries, events, and state using a domain-driven, vertical slice architecture.

## Essential Commands

```bash
# Development
pnpm dev           # Watch mode for all packages
pnpm build         # Build all packages
pnpm test          # Run tests
pnpm lint          # Lint all packages
pnpm type-check    # TypeScript type checking
pnpm check         # Run lint, type-check, and test

# Utilities
pnpm clean         # Clean all build artifacts and node_modules
pnpm start         # Start the CLI application

# Run single test
pnpm test <test-file-pattern>
```

## Architecture

### Monorepo Structure

- **Package Manager**: pnpm with workspace support
- **Build System**: Turborepo for task orchestration
- **Node Version**: >= 20.0.0 required
- **Test Framework**: Vitest (files: `*.specs.ts`)

### Key Applications

- **apps/cli**: Main CLI interface (`auto-engineer` or `ag` commands)
- **apps/api**: Backend API server with message bus integration

### Core Packages

- **flowlang**: DSL for defining flows with fluent API
- **emmett-generator**: Code generation from flow specifications using EJS templates
- **ai-integration**: Unified AI provider interface (OpenAI, Anthropic, Google AI, X.AI)
- **message-bus**: Event-driven messaging system with CQRS pattern
- **frontend-scaffold**: React/GraphQL application scaffolding with Shadcn/ui

## Key Patterns

### FlowLang DSL

Uses fluent API for command, query, and reaction slices:

```typescript
// Example flow structure
const flow = Flow()
  .command('CreateOrder', { customerId: string, items: OrderItem[] })
  .event('OrderCreated', { orderId: string, total: number })
  .reaction('SendConfirmationEmail', { orderId: string })
```

### Vertical Slice Architecture

- Features organized as complete vertical slices
- Each slice contains UI, business logic, and data access
- Organized by business domains, not technical layers

### Event Sourcing & CQRS

- Command/Query separation with immutable event streams
- Event-driven architecture using the message bus
- Read model projections for queries

## Environment Requirements

At least one AI provider key is required:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `XAI_API_KEY`

## Code Generation

The emmett-generator package creates:

- GraphQL/Apollo server implementations
- Type-safe command/event handling
- React components with Shadcn/ui
- Complete CRUD operations from flow specifications

## Testing Strategy

- Vitest for unit/integration tests
- BDD-style specifications using Given-When-Then
- Specification by Example embedded in flows
- Test files use `*.specs.ts` pattern

## Linting

- You are not allowed to relax lint rules
- You must fix the underlying issues rather than just make the checks pass

## Important Notes
ALWAYS run `pnpm check` after you finish all your changes and fix any problems. 
ALWAYS use the IDE diagnostics tool to check all the files that are not commited remotely.
ALWAYS perform a git log and see previous commits when tests fail. You need to look at `origin/main` and `origin/current_branch` to see why things were passing before any current changes. It's safe to assume that what's on git is working typically since every dev runs commit hooks and we have CI/CD checks.
