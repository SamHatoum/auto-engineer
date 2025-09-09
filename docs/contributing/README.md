# Contributing

## Development Setup

This guide explains how to set up a local development environment for contributing to Auto Engineer.

### Prerequisites

* **Node.js**: Version 20.0.0 or higher
* **pnpm**: Version 8.15.4 or higher
* **Git**: For cloning the repository
* **AI Provider API Key**: At least one from:
  * Anthropic Claude
  * OpenAI
  * Google Gemini
  * X.AI Grok

### Setup Steps

1. **Clone the repository**: `git clone https://github.com/SamHatoum/auto-engineer.git cd auto-engineer`
2. **Install dependencies**: `pnpm install`
3. **Run the app**: `pnpm watch`
4. **Set up environment variables**: Create a `.env` file in the root directory: `echo "ANTHROPIC_API_KEY=your-key-here" .env`

### Working with Local Packages

To use local packages in example projects:

1. Navigate to an example project (e.g., `examples/shopping-app`): `cd examples/shopping-app`
2. Install packages using the workspace protocol:

```bash
   pnpm add '@auto-engineer/cli@workspace:*' \
            '@auto-engineer/flow@workspace:*' \
            '@auto-engineer/server-checks@workspace:*' \
            # ... add other packages as needed
```

This ensures local package changes are reflected immediately without manual linking.

### Running the Message Bus Server

Start the message bus server to monitor commands and events: `pnpm auto` Access the web dashboard at `http://localhost:5555`.

### Development Workflow

1. **Edit source files** in `packages/*/src/`.
2. **Build affected packages**: `pnpm build --filter=@auto-engineer/cli` Or build all packages: `bash pnpm build`
3. **Run tests**: `pnpm test` Or test a specific package: `pnpm test --filter=@auto-engineer/flow`
4. **Run linting and type checking**: `pnpm check`

For more details on contributing, see the Contributing Guide.

## Testing

All contributions must pass tests to ensure quality.

### Running Tests

```bash
pnpm test
```

Runs unit, integration, and E2E tests via Turborepo. Fix failures before submitting a PR.

### Linting & Type Checking

```bash
pnpm lint --fix
pnpm check:types
```

### Best Practices

* Write clear, focused tests for single behaviors.
* Cover edge cases (e.g., invalid inputs).
* Aim for 80%+ test coverage: pnpm test:coverage.
* Manually test UI or complex flows locally.
* Update test docs if processes change.
