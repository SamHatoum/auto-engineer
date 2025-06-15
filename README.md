[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg)](https://www.elastic.co/licensing/elastic-license)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange)](https://turbo.build/repo)


# Auto Engineer
Goal: Create a production-grade application builder, not just another prototype tool. 

We're building a sophisticated system that generates well-architected, scalable applications with proper design patterns, robust external system integrations, and enterprise-grade security.

It takes a village, so roll up your sleeves and join us – or show your support by clicking star to keep an eye ⭐☝️.

## 🚀 Getting Started

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

## 📝 License

This project is licensed under the Elastic License 2.0 - see the [LICENSE](LICENSE) file for details. 
