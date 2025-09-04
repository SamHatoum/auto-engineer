# @auto-engineer/file-syncer

A file synchronization plugin for the Auto Engineer CLI that provides real-time, two-way file synchronization over WebSockets. It monitors file changes, synchronizes project files, and supports TypeScript type definitions and external package discovery for seamless integration with the Auto Engineer ecosystem.

## Installation

Install the package as a dependency in your Auto Engineer project:

```bash
npm install @auto-engineer/file-syncer
```

## Configuration

Add the plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/file-syncer',
    // ... other plugins
  ],
};
```

## What does this package do?

The `@auto-engineer/file-syncer` plugin enables real-time, two-way file synchronization between a server and connected clients using WebSockets (`socket.io`). It watches a specified directory (e.g., `flows/`) for changes, synchronizes project files, and includes TypeScript type definitions (`.d.ts`) for external packages. It integrates with the Auto Engineer ecosystem to manage flow specifications and dependencies.

## Key Features

### Real-Time File Synchronization

- Monitors file changes using `chokidar` for real-time updates
- Supports `add`, `change`, and `delete` events for files and directories
- Uses WebSockets (`socket.io`) for two-way communication between server and clients
- Sends incremental updates (`WireChange`) or full snapshots (`WireInitial`)

### File System Integration

- Uses `@auto-engineer/file-store` (`NodeFileStore`) for file system operations
- Handles binary file content with base64 encoding
- Computes MD5 hashes for efficient change detection
- Supports POSIX-style paths for cross-platform compatibility

### TypeScript Type Definition Discovery

- Automatically discovers `.d.ts` files for external packages
- Probes `node_modules` for `package.json` (`types`/`typings`), `index.d.ts`, and `dist/index.d.ts`
- Supports `@types/*` packages for missing type definitions
- Deduplicates type definitions by selecting the best path (e.g., prefers `server/node_modules` over `.pnpm`)

### External Package Detection

- Harvests bare imports from source files (`.ts`, `.js`, `.tsx`, `.jsx`)
- Extracts package names from `import`, `require`, and dynamic `import()` statements
- Combines with flow-defined externals from `@auto-engineer/flow`

### Event-Driven Architecture

- Integrates with `@auto-engineer/message-bus` for event-driven communication
- Emits file change events to clients via WebSockets
- Handles client-initiated file changes (`write`, `delete`)

## Usage

### Starting the File Syncer Server

Run the file syncer server to watch a directory (e.g., `flows/`):

```bash
npx @auto-engineer/file-syncer ./flows
```

This starts a WebSocket server on `ws://localhost:3001` that monitors the specified directory and synchronizes changes with connected clients.

### Client Integration

Connect to the WebSocket server using `socket.io-client`:

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001');

socket.on('initial-sync', (data: { files: Array<{ path: string; content: string }>; directory: string }) => {
  console.log('Initial sync received:', data.files.length, 'files');
  // Process initial file snapshot
});

socket.on('file-change', (change: { event: 'add' | 'change' | 'delete'; path: string; content?: string }) => {
  console.log('File change:', change.event, change.path);
  // Handle file add, change, or delete
});

// Send a file change to the server
socket.emit('client-file-change', {
  event: 'write',
  path: '/example.txt',
  content: Buffer.from('Hello, world!').toString('base64'),
});
```

### Debugging

Enable debug logging with the `DEBUG` environment variable:

```bash
DEBUG=sync:* npm run start:server ./flows
```

This enables detailed logs for file synchronization, WebSocket events, and discovery operations.

## Project Structure

```
file-syncer/
├── src/
│   ├── index.ts                  # CLI entry point
│   ├── server/
│   │   ├── startServer.ts        # WebSocket server implementation
│   ├── sync/
│   │   ├── computeDesiredSet.ts  # Computes files to sync
│   ├── discovery/
│   │   ├── bareImports.ts        # Bare import extraction
│   │   ├── dts.ts                # TypeScript .d.ts discovery
│   ├── types/
│   │   ├── wire.ts               # WebSocket message types
│   ├── utils/
│   │   ├── hash.ts               # File hashing utilities
│   │   ├── path.ts               # Path manipulation utilities
├── CHANGELOG.md                  # Version history
├── package.json
├── tsconfig.json
```

## Quality Assurance

- **Type Safety**: Full TypeScript support with strict type checking
- **Testing**: Unit tests using Vitest (configured in `tsconfig.test.json`)
- **Linting**: ESLint and Prettier for code quality
- **Error Handling**: Robust error handling for file operations and WebSocket communication
- **Performance**: Debounced file system rebuilds to prevent excessive updates

## Integration with Auto Engineer Ecosystem

Works with other Auto Engineer plugins:

- **@auto-engineer/file-store**: Provides file system operations (`NodeFileStore`)
- **@auto-engineer/flow**: Retrieves flow specifications and externals
- **@auto-engineer/message-bus**: Emits events for file changes
- **@auto-engineer/server-generator-apollo-emmett**: Synchronizes server code
- **@auto-engineer/frontend-generator-react-graphql**: Synchronizes frontend code

## Commands

The plugin provides a single CLI command:

```bash
npx @auto-engineer/file-syncer <watchDir>
```

- `<watchDir>`: Directory to monitor for file changes (e.g., `./flows`)

## Advanced Features

### Two-Way Synchronization

- Server-to-client: Sends file changes (`add`, `change`, `delete`) and initial snapshots
- Client-to-server: Handles client-initiated file writes and deletions
- Uses base64 encoding for file content transmission

### Type Definition Probing

- Dynamically discovers `node_modules` roots from project files
- Prioritizes `server/node_modules` and avoids `.pnpm` paths
- Falls back to `@types/*` packages for missing type definitions

### Change Detection

- Uses MD5 hashes to detect file changes
- Tracks active files to compute diffs efficiently
- Handles deletions by removing files from the active set

### Debounced Rebuilds

- Debounces file system events (100ms) to reduce redundant rebuilds
- Recomputes the desired file set on changes
- Sends incremental updates or full snapshots as needed

## Getting Started

1. Install the plugin (see Installation above)
2. Add it to your `auto.config.ts`
3. Start the file syncer server:

   ```bash
   npx @auto-engineer/file-syncer ./flows
   ```

4. Connect a client to `ws://localhost:3001` to receive file updates
5. Use the Auto Engineer CLI to manage your project:

   ```bash
   npm run start
   ```

## Dependencies

- `@auto-engineer/file-store`: For file system operations
- `@auto-engineer/flow`: For flow specification retrieval
- `@auto-engineer/message-bus`: For event-driven communication
- `chokidar`: For file system watching
- `socket.io`: For WebSocket communication

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.
