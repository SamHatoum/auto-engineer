# @auto-engineer/create-auto-app

A CLI tool for creating new Auto Engineer applications with minimal configuration. This package scaffolds complete project structures, including templates, dependencies, and configuration for the Auto Engineer ecosystem.

## Installation

Install the `create-auto-app` package globally to use it as a CLI tool:

```bash
npm install -g create-auto-app
```

## Usage

Run the CLI to create a new Auto Engineer project:

```bash
create-auto-app my-auto-app
```

This will prompt you to configure your project interactively. Alternatively, you can specify options directly:

```bash
create-auto-app my-auto-app --template=shopping-app --preset=full --use-pnpm --install
```

### Options

- `[project-name]`: Name of the project directory (use "." for current directory)
- `-t, --template <template>`: Project template (e.g., `shopping-app`, default: `shopping-app`)
- `-p, --preset <preset>`: Package preset (`minimal` or `full`, default: `full`)
- `--no-install`: Skip dependency installation
- `--use-npm`: Use npm as the package manager
- `--use-yarn`: Use yarn as the package manager
- `--use-pnpm`: Use pnpm as the package manager

## What does this package do?

The `create-auto-app` CLI scaffolds new Auto Engineer projects with pre-configured templates or presets. It sets up project structure, installs dependencies, and configures the Auto Engineer CLI with the necessary plugins for building event-driven applications.

## Key Features

### Project Scaffolding

- Creates project directories with a consistent structure
- Generates `package.json` with appropriate dependencies
- Sets up `auto.config.ts` for Auto Engineer CLI plugins
- Includes `.gitignore` and basic `README.md`

### Template Support

- **Shopping App Template**: A full e-commerce example with client and server components
- Customizable through command-line options or interactive prompts

### Preset Options

- **Minimal Preset**: Includes essential packages (`@auto-engineer/flow`, `@auto-engineer/server-generator-apollo-emmett`)
- **Full Preset**: Includes all Auto Engineer plugins for a complete setup

### Package Manager Support

- Automatically detects preferred package manager (`npm`, `yarn`, or `pnpm`)
- Allows explicit selection via command-line flags
- Installs dependencies in monorepo or standalone projects

### Dependency Management

- Fetches latest versions of Auto Engineer packages
- Updates `package.json` files with correct versions
- Supports monorepo setups with `pnpm-workspace.yaml`

## Generated Project Structure

For the `shopping-app` template:

```
my-auto-app/
├── client/                    # Frontend application
├── server/                    # Backend application
├── flows/                     # Flow specifications
├── .context/                  # Context files
├── auto.config.ts             # Auto Engineer CLI configuration
├── package.json               # Root package configuration
├── pnpm-workspace.yaml        # Monorepo workspace configuration
├── .gitignore                 # Git ignore file
└── README.md                  # Project documentation
```

For minimal/full preset:

```
my-auto-app/
├── flows/                     # Flow specifications
├── .context/                  # Context files
├── auto.config.ts             # Auto Engineer CLI configuration
├── package.json               # Project dependencies
├── .gitignore                 # Git ignore file
└── README.md                  # Project documentation
```

## Getting Started

1. **Create a new project**:

   ```bash
   create-auto-app my-auto-app
   ```

2. **Follow the interactive prompts** to select:
   - Project name
   - Setup type (template, minimal, or full)
   - Whether to install dependencies

3. **Navigate to the project directory**:

   ```bash
   cd my-auto-app
   ```

4. **Install dependencies** (if not done during creation):

   ```bash
   npm install
   ```

5. **Start development**:

   ```bash
   npm run start
   ```

## Available Commands (in generated project)

- `auto generate:server`: Generate server from flows
- `auto generate:client`: Generate client application
- `auto check:frontend`: Run frontend checks
- `auto check:server`: Run server checks

## Integration with Auto Engineer Ecosystem

The generated project integrates with the following Auto Engineer plugins (depending on preset):

- **@auto-engineer/flow**: Define business flows
- **@auto-engineer/server-generator-apollo-emmett**: Generate GraphQL servers
- **@auto-engineer/frontend-generator-react-graphql**: Generate React clients
- **@auto-engineer/server-implementer**: AI-powered server implementation
- **@auto-engineer/frontend-implementer**: AI-powered frontend implementation
- **@auto-engineer/server-checks**: Server validation
- **@auto-engineer/frontend-checks**: Frontend validation
- **@auto-engineer/design-system-importer**: Design system integration
- **@auto-engineer/information-architect**: Information architecture generation
- **@auto-engineer/message-bus**: Event-driven communication

## Example Workflow

```bash
# Create a project with the shopping-app template
create-auto-app my-shop --template=shopping-app --use-pnpm

# Navigate to the project
cd my-shop

# Install dependencies (if not already installed)
pnpm install

# Start development
pnpm run start
```

## Configuration

The CLI generates an `auto.config.ts` file with the appropriate plugins based on the selected preset or template:

```typescript
export default {
  plugins: [
    '@auto-engineer/flow',
    '@auto-engineer/server-generator-apollo-emmett',
    // ... other plugins based on preset
  ],
};
```

## Quality Assurance

- **Type Safety**: Generates TypeScript-compatible projects
- **Dependency Management**: Ensures latest package versions
- **Error Handling**: User-friendly prompts for directory conflicts
- **Monorepo Support**: Configures `pnpm-workspace.yaml` for multi-package projects

## Changelog

See CHANGELOG.md for version history and updates.

## Learn More

Visit the Auto Engineer Documentation for more details on the Auto Engineer ecosystem.
