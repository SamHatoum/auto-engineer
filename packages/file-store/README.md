# @auto-engineer/file-store

A file storage plugin for the Auto Engineer CLI, providing a unified interface for file system operations. It supports both in-memory and Node.js-based file storage, with robust handling of file paths, directories, and binary/text data.

## Installation

Install the package as a dependency in your Auto Engineer project:

```bash
npm install @auto-engineer/file-store
```

## Configuration

Add the plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/file-store',
    // ... other plugins
  ],
};
```

## What does this package do?

The `@auto-engineer/file-store` package provides a consistent interface for file system operations within the Auto Engineer ecosystem. It supports both in-memory (`InMemoryFileStore`) and disk-based (`NodeFileStore`) file storage, enabling flexible file management for development, testing, and production environments.

## Key Features

### Unified File Store Interface

- Implements `IFileStore` and `IExtendedFileStore` interfaces for consistent file operations
- Supports binary (`Uint8Array`) and text-based file operations
- Handles file paths in a platform-agnostic way (POSIX-style paths)

### In-Memory File Store

- `InMemoryFileStore`: Stores files in memory for testing or ephemeral use cases
- Supports file writes, reads, existence checks, and directory tree listing
- Normalizes paths to POSIX format for consistency

### Node.js File Store

- `NodeFileStore`: Interacts with the local file system using Node.js APIs
- Supports recursive directory creation, file reading/writing, and directory listing
- Handles symlinks and error cases gracefully
- Provides utility methods for path manipulation (`join`, `dirname`, `fromHere`)

### File Operations

- **Write**: Write binary (`write`) or text (`writeText`) data to files
- **Read**: Read binary (`read`) or text (`readText`) data from files
- **Exists**: Check if a file or directory exists (`exists`)
- **Remove**: Delete files or directories (`remove`)
- **List Tree**: List directory trees with file and directory metadata (`listTree`)
- **Directory Management**: Create directories (`ensureDir`), list directory contents (`readdir`)

### Path Handling

- Converts Windows-style paths to POSIX-style paths (`toPosix`)
- Resolves relative and absolute paths
- Supports `file://` URLs for compatibility

## Usage

### Using InMemoryFileStore

```typescript
import { InMemoryFileStore } from '@auto-engineer/file-store';

const fileStore = new InMemoryFileStore();

await fileStore.write('/example.txt', new TextEncoder().encode('Hello, world!'));
const content = await fileStore.read('/example.txt');
console.log(new TextDecoder().decode(content)); // Outputs: Hello, world!

const tree = await fileStore.listTree('/');
console.log(tree); // [{ path: '/', type: 'dir', size: 0 }, { path: '/example.txt', type: 'file', size: 13 }]
```

### Using NodeFileStore

```typescript
import { NodeFileStore } from '@auto-engineer/file-store';

const fileStore = new NodeFileStore();

await fileStore.writeText('example.txt', 'Hello, world!');
const content = await fileStore.readText('example.txt');
console.log(content); // Outputs: Hello, world!

await fileStore.ensureDir('nested/dir');
await fileStore.write('nested/dir/file.txt', new TextEncoder().encode('Nested content'));

const tree = await fileStore.listTree(process.cwd());
console.log(tree); // Lists directories and files with paths, types, and sizes
```

### Path Utilities

```typescript
import { NodeFileStore, toPosix } from '@auto-engineer/file-store';

const fileStore = new NodeFileStore();

const path = fileStore.join('path', 'to', 'file.txt');
console.log(path); // Outputs: path/to/file.txt (POSIX format)

const dir = fileStore.dirname('path/to/file.txt');
console.log(dir); // Outputs: path/to

const resolvedPath = fileStore.fromHere('relative/file.txt');
console.log(resolvedPath); // Outputs: absolute path to relative/file.txt
```

## Project Structure

```
file-store/
├── src/
│   ├── index.ts              # Exports and main entry point
│   ├── InMemoryFileStore.ts  # In-memory file store implementation
│   ├── NodeFileStore.ts      # Node.js file store implementation
│   ├── path.ts               # Path utility functions
│   ├── types.ts              # Type definitions for file store interfaces
│   ├── NodeFileStore.specs.ts # Unit tests
├── CHANGELOG.md              # Version history
├── package.json
├── tsconfig.json
├── tsconfig.test.json
```

## Quality Assurance

- **Type Safety**: Full TypeScript support with strict type checking
- **Testing**: Unit tests using Vitest for `NodeFileStore`
- **Linting**: ESLint and Prettier for code quality
- **Error Handling**: Graceful handling of file system errors and edge cases
- **Platform Compatibility**: POSIX-style paths for cross-platform consistency

## Integration with Auto Engineer Ecosystem

Works with other Auto Engineer plugins:

- **@auto-engineer/flow**: Stores flow specifications
- **@auto-engineer/server-generator-apollo-emmett**: Manages server code files
- **@auto-engineer/frontend-generator-react-graphql**: Manages frontend code files
- **@auto-engineer/server-implementer**: Reads/writes server implementation files
- **@auto-engineer/frontend-implementer**: Reads/writes frontend implementation files

## Commands

This plugin integrates with the Auto Engineer CLI but does not expose direct CLI commands. It is used internally by other plugins for file operations.

## Debugging

Enable debugging with the `DEBUG` environment variable:

```bash
DEBUG=file-store:* npm run dev
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

## Getting Started

1. Install the plugin (see Installation above)
2. Add it to your `auto.config.ts`
3. Use `InMemoryFileStore` or `NodeFileStore` in your application or tests

Example:

```bash
# Install the plugin
npm install @auto-engineer/file-store

# Run your Auto Engineer project
npm run start
```

## Advanced Features

### In-Memory Store

- Ideal for unit testing and temporary file storage
- Fast and lightweight, with no disk I/O
- Supports directory tree operations

### Node.js Store

- Handles recursive directory creation for nested paths
- Supports symlink resolution for `listTree`
- Provides text-based file operations for convenience
- Robust error handling for file system operations

### Path Normalization

- Ensures consistent POSIX-style paths across platforms
- Supports `file://` URLs and relative/absolute paths
- Utility methods for path manipulation
