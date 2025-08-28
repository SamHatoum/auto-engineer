import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import createDebug from 'debug';

const debug = createDebug('frontend-impl:mcp');
const debugTools = createDebug('frontend-impl:mcp:tools');
const debugServer = createDebug('frontend-impl:mcp:server');
const debugLifecycle = createDebug('frontend-impl:mcp:lifecycle');

interface Component {
  type: string;
  items?: Record<string, unknown>;
}

interface Scheme {
  generatedComponents?: Component[];
  atoms?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  molecules?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  organisms?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  pages?: {
    description?: string;
    items?: Record<string, unknown>;
  };
}

// Helper to recursively list files
async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(res, base);
      } else {
        return [path.relative(base, res)];
      }
    }),
  );
  return files.flat();
}

// Helper to read auto-ia-scheme.json
async function readAutoIAScheme(directory: string): Promise<Scheme> {
  const filePath = path.join(directory, 'auto-ia-scheme.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as Scheme;
}

function buildEntities(scheme: Scheme) {
  const entities = [];
  if (scheme.atoms) entities.push({ type: 'atoms', items: Object.keys(scheme.atoms.items ?? {}) });
  if (scheme.molecules) entities.push({ type: 'molecules', items: Object.keys(scheme.molecules.items ?? {}) });
  if (scheme.organisms) entities.push({ type: 'organisms', items: Object.keys(scheme.organisms.items ?? {}) });
  if (scheme.pages) entities.push({ type: 'pages', items: Object.keys(scheme.pages.items ?? {}) });
  return entities;
}

debugServer('Initializing MCP server with name: frontend-implementation, version: 0.1.0');
const server = new McpServer({
  name: 'frontend-implementation',
  version: '0.1.0',
});
debugServer('MCP server instance created');

// Tool: List all files in the project
debugTools('Registering tool: listFiles');
server.registerTool(
  'listFiles',
  {
    title: 'List Project Files',
    description: 'List all files in the given project directory.',
    inputSchema: {
      directory: z.string().min(1, 'Directory is required'),
    },
  },
  async ({ directory }: { directory: string }) => {
    debugTools('listFiles called with directory: %s', directory);
    try {
      const files = await listFiles(directory);
      debugTools('Found %d files in directory', files.length);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    } catch (error) {
      debugTools('Error listing files: %O', error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: Read a file
debugTools('Registering tool: readFile');
server.registerTool(
  'readFile',
  {
    title: 'Read File',
    description: 'Read the contents of a file in the project.',
    inputSchema: {
      directory: z.string().min(1, 'Directory is required'),
      relativePath: z.string().min(1, 'Relative file path is required'),
    },
  },
  async ({ directory, relativePath }: { directory: string; relativePath: string }) => {
    debugTools('readFile called - directory: %s, relativePath: %s', directory, relativePath);
    try {
      const filePath = path.join(directory, relativePath);
      debugTools('Reading file from: %s', filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      debugTools('File read successfully, size: %d bytes', content.length);
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      debugTools('Error reading file: %O', error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: Create or update a file
debugTools('Registering tool: createOrUpdateFile');
server.registerTool(
  'createOrUpdateFile',
  {
    title: 'Create or Update File',
    description: 'Create or overwrite a file in the given React project directory.',
    inputSchema: {
      directory: z.string().min(1, 'Directory is required'),
      relativePath: z.string().min(1, 'Relative file path is required'),
      content: z.string().min(1, 'File content is required'),
    },
  },
  async ({ directory, relativePath, content }: { directory: string; relativePath: string; content: string }) => {
    debugTools(
      'createOrUpdateFile called - directory: %s, relativePath: %s, content size: %d',
      directory,
      relativePath,
      content.length,
    );
    try {
      const filePath = path.join(directory, relativePath);
      debugTools('Writing file to: %s', filePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      debugTools('File written successfully');
      return {
        content: [
          {
            type: 'text',
            text: `File created/updated: ${filePath}`,
          },
        ],
      };
    } catch (error) {
      debugTools('Error creating/updating file: %O', error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error creating/updating file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: Read auto-ia-scheme.json
debugTools('Registering tool: readAutoIAScheme');
server.registerTool(
  'readAutoIAScheme',
  {
    title: 'Read auto-ia-scheme.json',
    description: 'Read and return the parsed auto-ia-scheme.json from the project root.',
    inputSchema: {
      directory: z.string().min(1, 'Directory is required'),
    },
  },
  async ({ directory }: { directory: string }) => {
    debugTools('readAutoIAScheme called with directory: %s', directory);
    try {
      const scheme = await readAutoIAScheme(directory);
      debugTools('IA scheme loaded successfully');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(scheme, null, 2),
          },
        ],
      };
    } catch (error) {
      debugTools('Error reading auto-ia-scheme.json: %O', error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error reading auto-ia-scheme.json: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Tool: List entities from auto-ia-scheme.json
debugTools('Registering tool: listAutoIASchemeEntities');
server.registerTool(
  'listAutoIASchemeEntities',
  {
    title: 'List Entities from auto-ia-scheme.json',
    description: 'List all atoms, molecules, organisms, and pages defined in auto-ia-scheme.json.',
    inputSchema: {
      directory: z.string().min(1, 'Directory is required'),
    },
  },
  async ({ directory }: { directory: string }) => {
    try {
      const scheme = await readAutoIAScheme(directory);
      const entities = buildEntities(scheme);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(entities, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error listing entities: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

const transport = new StdioServerTransport();

async function cleanup() {
  debug('Cleanup initiated');
  console.log('Cleaning up...');
  await transport.close();
  debug('Transport closed, exiting process');
  process.exit(0);
}

process.on('SIGTERM', () => {
  void cleanup();
});
process.on('SIGINT', () => {
  void cleanup();
});

async function startServer() {
  debugLifecycle('Starting MCP server');
  debugServer('Connecting server to transport');
  await server.connect(transport);
  console.error('Frontend Implementation MCP Server running on stdio');
  debugLifecycle('MCP server connected and running');
  debugServer('Server ready to handle requests');
}

// Only start the server if this file is run directly
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  debugLifecycle('Running as main module, starting server');
  startServer().catch((error) => {
    debugLifecycle('Fatal error starting server: %O', error);
    console.error(error);
  });
} else {
  debugLifecycle('Module imported, not starting MCP server');
}

export * from './commands/implement-client';
export { CLI_MANIFEST } from './cli-manifest';
