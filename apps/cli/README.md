# Auto Engineer CLI

A powerful command-line interface for automating development workflows, following Node.js CLI best practices.

## Features

- ✅ **POSIX-compliant** command line arguments
- ✅ **Empathic CLI** with interactive prompts and helpful error messages
- ✅ **Colorful output** with graceful degradation
- ✅ **Rich interactions** with progress spinners and prompts
- ✅ **STDIN support** for piping data
- ✅ **Structured output** in JSON format
- ✅ **Cross-platform** compatibility
- ✅ **Configuration precedence** (CLI args > env vars > config files)
- ✅ **Containerized** distribution via Docker
- ✅ **Analytics** with strict opt-in
- ✅ **Proper error handling** with error codes
- ✅ **Debug mode** for troubleshooting

## Installation

### npm (Recommended)
```bash
npm install -g @auto-engineer/cli
```

### Docker
```bash
docker pull auto-engineer/cli
docker run --rm auto-engineer/cli --help
```

## Quick Start

1. **Initialize** your project:
   ```bash
   auto-engineer init
   ```

2. **Generate** code templates:
   ```bash
   auto-engineer generate --type code
   ```

3. **Analyze** your code:
   ```bash
   auto-engineer analyze --format json
   ```

## Commands

### `init`
Initialize auto-engineer configuration for your project.

```bash
auto-engineer init [options]
```

**Options:**
- `-y, --yes` - Skip prompts and use defaults
- `-p, --path <path>` - Project path (default: current directory)

**Examples:**
```bash
# Interactive initialization
auto-engineer init

# Quick initialization with defaults
auto-engineer init --yes

# Initialize in specific directory
auto-engineer init --path ./my-project
```

### `generate`
Generate code, documentation, or other artifacts.

```bash
auto-engineer generate [options]
```

**Options:**
- `-t, --type <type>` - Type of generation (code, docs, tests)
- `-o, --output <path>` - Output path for generated files
- `-f, --force` - Overwrite existing files
- `--stdin` - Read input from STDIN

**Examples:**
```bash
# Generate code templates
auto-engineer generate --type code

# Generate with custom output path
auto-engineer generate --type docs --output ./docs

# Generate from STDIN
echo "component" | auto-engineer generate --stdin
```

### `analyze`
Analyze code quality and provide insights.

```bash
auto-engineer analyze [options]
```

**Options:**
- `-p, --path <path>` - Path to analyze (default: current directory)
- `-f, --format <format>` - Output format (text, json)
- `--stdin` - Analyze content from STDIN

**Examples:**
```bash
# Analyze current directory
auto-engineer analyze

# Analyze specific path in JSON format
auto-engineer analyze --path ./src --format json

# Analyze content from STDIN
cat file.js | auto-engineer analyze --stdin
```

## Global Options

- `-v, --version` - Show version number
- `-d, --debug` - Enable debug mode
- `--no-color` - Disable colored output
- `--json` - Output in JSON format
- `--api-token <token>` - API token for external services
- `--project-path <path>` - Project path to work with

## Environment Variables

- `DEBUG=auto-engineer` - Enable debug mode
- `NO_COLOR=1` - Disable colored output
- `OUTPUT_FORMAT=json` - Set output format
- `AUTO_ENGINEER_API_TOKEN=<token>` - Set API token
- `AUTO_ENGINEER_ANALYTICS=true` - Enable analytics

## Configuration

Auto-engineer follows configuration precedence:

1. **Command line arguments** (highest priority)
2. **Environment variables**
3. **Project configuration** (`.auto-engineer.json`)
4. **User configuration** (`~/.auto-engineer.json`)
5. **System configuration** (defaults)

### Project Configuration

Create `.auto-engineer.json` in your project root:

```json
{
  "projectType": "node-ts",
  "packageManager": "npm",
  "testFramework": "vitest",
  "enableLinting": true,
  "enableGitHooks": true
}
```

## Error Codes

Auto-engineer uses standardized error codes for easy troubleshooting:

- `E4001` - Validation error
- `E4002` - Configuration error
- `E4003` - Invalid API token
- `E4004` - Invalid project path
- `E4005` - Missing generation type
- `E4006` - Missing output path
- `E4007` - Invalid path type
- `E4008` - Path does not exist
- `E5001` - Runtime error
- `E9999` - Unknown error

## Analytics

Auto-engineer collects anonymous usage analytics to improve the tool. Analytics are:

- **Strictly opt-in** - You must explicitly consent
- **Anonymous** - No personal information is collected
- **Transparent** - You can see what data is collected
- **Controllable** - You can disable anytime

To enable analytics:
```bash
export AUTO_ENGINEER_ANALYTICS=true
```

To disable analytics:
```bash
export AUTO_ENGINEER_ANALYTICS=false
```

## Development

### Prerequisites
- Node.js 18.0.0 or higher
- npm, yarn, or pnpm

### Setup
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Project Structure
```
src/
├── commands/          # Command implementations
│   ├── generate.ts
│   ├── analyze.ts
│   └── init.ts
├── utils/             # Utility functions
│   ├── config.ts      # Configuration management
│   ├── errors.ts      # Error handling
│   ├── terminal.ts    # Terminal utilities
│   └── analytics.ts   # Analytics
└── index.ts           # Main entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [GitHub Wiki](https://github.com/your-repo/auto-engineer/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/auto-engineer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/auto-engineer/discussions) 