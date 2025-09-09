# Getting Started

## Installation

This guide explains how to install Auto Engineer and set up prerequisites.

### Prerequisites

Before installing Auto Engineer, ensure you have the following:

* **Node.js**: Version 20.0.0 or higher
* **pnpm**: Version 8.15.4 or higher
* **AI Provider API Key**: At least one of the following:
  * Anthropic Claude (recommended)
  * OpenAI
  * Google Gemini
  * X.AI Grok

### Installation Steps

Auto Engineer uses a plugin-based architecture, allowing you to install only the components you need. Follow these steps to set up a new project:

1. **Create a new Auto project**:

```bash
npx create-auto-app@latest <project-name>
```

2. **Configure API keys**: Copy the `.env.template` variables into a new `.env` and add your API keys:

```bash
# Auto-Engineer Environment Variables

# At least one of these is required
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-google-key
XAI_API_KEY=your-xai-key

# Custom Provider Configuration (optional)
# Use this to connect to any OpenAI-compatible API endpoint
CUSTOM_PROVIDER_NAME=litellm
CUSTOM_PROVIDER_BASE_URL=https://api.litellm.ai
CUSTOM_PROVIDER_API_KEY=your-custom-api-key
CUSTOM_PROVIDER_DEFAULT_MODEL=claude-3-sonnet

# Optional: Set default provider and model
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o-mini

# Debug Configuration
DEBUG=
NO_COLOR=
OUTPUT_FORMAT=text

# Figma
FIGMA_PERSONAL_TOKEN=your-figma-personal-access-token
FIGMA_FILE_ID=your-figma-file-id
```

### Next Steps

After installation, configure your plugins in an `auto.config.ts` file. See Configuration Basics for details. To create your first app, follow the Quickstart Guide.

## Quickstart

This guide walks you through creating your first application with Auto Engineer.

### Prerequisites

Ensure you have completed the Installation steps, including installing Node.js, pnpm, the Auto Engineer CLI, and at least one AI provider API key.

### Creating Your First App

1. **Create a new example project**: `auto create:example --name=shopping-assistant`
2. **Navigate to the project directory**: `cd shopping-assistant`
3. **Install dependencies**: `pnpm install`
4. **Export flow schemas**: `auto export:schema --output-dir=./.context --directory=./flows`
5. **Generate and implement the server**:

```
auto generate:server --schema-path=.context/schema.json --destination=. auto implement:server --server-directory=./server
```

6. **Run server validation**:

```
auto check:types --target-directory=./server auto check:tests --target-directory=./server auto check:lint --target-directory=./server --fix
```

7. **Generate and implement the frontend** (requires additional plugins):

```auto
--ia-schema=./auto-ia.json --gql-schema=./schema.graphql --figma-vars=./figma-vars.json auto implement:client --project-dir=./client --ia-scheme-dir=./.context --design-system-path=./design-system.md
```

8. **Start the application**: `pnpm start`

### Next Steps

* Explore the generated project structure and modify the flow models in the `flows/` directory.
* Learn more about configuring plugins in Configuration Basics.
* See CLI Guide for a full list of available commands.

## Configuration Basics

Auto Engineer uses a configuration file, `auto.config.ts`, to define plugins and resolve command alias conflicts. This guide covers the basics of setting up the configuration.

### Creating the Configuration File

In your project root, create an `auto.config.ts` file with the following structure:

```typescript
export default {
  plugins: [
    '@auto-engineer/flow',
    '@auto-engineer/server-generator-apollo-emmett',
    '@auto-engineer/server-implementer',
  ],
  aliases: {
    // Optional: Override command aliases if conflicts arise // 'command:name': '@auto-engineer/package-name'
  },
};
```

#### Key Configuration Options

* **plugins**: An array of plugin package names to load. Only include the plugins required for your project.
* **aliases**: An optional object to resolve command alias conflicts by mapping a command to a specific plugin package.

### Handling Plugin Conflicts

If multiple plugins register the same command alias, Auto Engineer will display an error. To resolve this, add an alias override in the `aliases` section of `auto.config.ts`. For example:

```typescript
export default {
  plugins: ['@auto-engineer/package-a', '@auto-engineer/package-b'],
  aliases: {
    'conflicting:command': '@auto-engineer/package-a',
  },
};
```

### Next Steps

* Install the plugins listed in your configuration as described in Installation.
* Learn how to use CLI commands in CLI Guide.

## CLI Guide

Auto Engineer provides a command-line interface (CLI) powered by plugins. Run `auto --help` to see available commands based on your installed plugins. Below are the common commands provided by core plugins.

### Flow Development

* `create:example --name=<project-name>`Creates an example project with the specified name.
* `export:schema --output-dir=<dir> --directory=<flows-dir>`Exports flow schemas to the specified output directory.

### Server Generation

* `generate:server --schema-path=<schema> --destination=<dest>`Generates server code from a schema file.
* `implement:server --server-directory=<dir>`Uses AI to implement the server code in the specified directory.
* `implement:slice --server-directory=<dir> --slice=<name>`Implements a specific server slice.

### Frontend Generation

* `generate:ia --output-dir=<dir> --flow-files=<patterns>`Generates an information architecture schema from flow files.
* `generate:client --starter-template=<template> --client-dir=<dir> --ia-schema=<file> --gql-schema=<file>`Generates a React client using the specified template and schemas.
* `implement:client --project-dir=<dir> --ia-scheme-dir=<dir> --design-system-path=<file>`Uses AI to implement the client code.

### Validation and Testing

* `check:types --target-directory=<dir> --scope=<project|changed>`Runs TypeScript type checking on the specified directory.
* `check:tests --target-directory=<dir> --scope=<project|changed>`Runs test suites for the specified directory.
* `check:lint --target-directory=<dir> --fix --scope=<project|changed>`Runs linting with an optional auto-fix feature.
* `check:client --client-directory=<dir> --skip-browser-checks`Performs full frontend validation, with an option to skip browser checks.

### Design System

* `import:design-system --figma-file-id=<id> --figma-access-token=<token> --output-dir=<dir>`Imports a design system from Figma.

### Notes

* All commands use named parameters for clarity (e.g., `--input-path=value`).
* Commands are provided by installed plugins. Ensure the relevant plugins are installed as described in Installation.
* For help with a specific command, run `auto <command> --help`.

### Next Steps

* Learn how to configure plugins in Configuration Basics.
* Explore flow modeling in Building a Flow.
