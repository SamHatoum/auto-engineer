# Auto Engineer

Use AI to build enterprise grade apps that scale.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg)](https://www.elastic.co/licensing/elastic-license)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange)](https://turbo.build/repo)


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

- `pnpm build` - Build all packages
- `pnpm dev` - Run development mode
- `pnpm test` - Run tests
- `pnpm lint` - Run linting
- `pnpm clean` - Clean all build artifacts

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