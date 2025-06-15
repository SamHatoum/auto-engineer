[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg)](https://www.elastic.co/licensing/elastic-license)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange)](https://turbo.build/repo)

# Auto Engineer

_Goal: Create a production-grade application builder, not just another prototype tool._

Auto Engineer generates well-architected, scalable applications with proper design patterns, robust external system integrations, and enterprise-grade security.

It takes a village, so roll up your sleeves and join in – or show your support by clicking star to keep an eye ⭐☝️.

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

# Run development mode
pnpm dev
```

## 🛠️ Development

### Available Scripts

- `pnpm build` - Build all packages in the monorepo
- `pnpm dev` - Run development mode across all packages
- `pnpm test` - Run all tests with coverage reporting
- `pnpm test:watch` - Run tests in watch mode for development
- `pnpm test:coverage` - Generate test coverage reports
- `pnpm lint` - Run linting across all packages
- `pnpm clean` - Clean all build artifacts and caches
- `pnpm changeset` - Create a new changeset for versioning
- `pnpm version` - Update versions based on changesets
- `pnpm release` - Publish packages based on changesets

### Adding a New Package

1. Create a new directory in either `apps/` or `packages/`
2. Initialize with `pnpm init`
3. Add necessary dependencies
4. Update the package's `package.json` with appropriate scripts

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: adds some amazing feature'`)
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
git commit -m "feat(packages/flowlang-modeling-agent): add new feature"
git commit -m "fix(apps/cli): correct CLI argument parsing"
git commit -m "chore(global): update repository settings"
```

## 📦 Versioning & Releases

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing packages.

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

## 📝 License

This project is licensed under the Elastic License 2.0 - see the [LICENSE](LICENSE) file for details.
