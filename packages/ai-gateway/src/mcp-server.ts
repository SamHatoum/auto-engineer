import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Define proper types for MCP tool handlers
interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown; // Index signature for additional properties
}

interface ToolDescription {
  title: string;
  description: string;
  inputSchema: Record<string, z.ZodSchema>;
}

type ToolHandler<T extends Record<string, unknown> = Record<string, unknown>> = (
  params: T
) => Promise<ToolResult>;

const server = new McpServer({
  name: 'frontend-implementation',
  version: '0.1.0',
});

const transport = new StdioServerTransport();

let isStarted = false;

async function cleanup() {
  console.log('Cleaning up...');
  await transport.close();
  process.exit(0);
}

process.on('SIGTERM', () => {
  void cleanup();
});
process.on('SIGINT', () => {
  void cleanup();
});

export { server };

// Helper function to adapt our handler to MCP's expected signature
function createMcpHandler<T extends Record<string, unknown>>(
  handler: ToolHandler<T>
): (args: Record<string, unknown>, extra: unknown) => Promise<ToolResult> {
  return (args: Record<string, unknown>, _extra: unknown) => {
    return handler(args as T);
  };
}

export function registerTool<T extends Record<string, unknown> = Record<string, unknown>>(
  name: string,
  description: ToolDescription,
  handler: ToolHandler<T>
) {
  if (isStarted) {
    throw new Error('Cannot register tools after server has started');
  }
  const mcpHandler = createMcpHandler(handler);
  server.registerTool(name, description, mcpHandler as unknown as ToolHandler);
}

export function registerTools<T extends Record<string, unknown> = Record<string, unknown>>(
  tools: Array<{
    name: string;
    description: ToolDescription;
    handler: ToolHandler<T>;
  }>
) {
  if (isStarted) {
    throw new Error('Cannot register tools after server has started');
  }
  tools.forEach(tool => {
    const mcpHandler = createMcpHandler(tool.handler);
    server.registerTool(tool.name, tool.description, mcpHandler as unknown as ToolHandler);
  });
}

export async function startServer() {
  if (isStarted) {
    console.warn('Server is already started');
    return;
  }

  await server.connect(transport);
  isStarted = true;
  console.error('AI Gateway MCP Server running on stdio');
}

export function isServerStarted() {
  return isStarted;
}

// Export the types for external use
export type { ToolResult, ToolDescription, ToolHandler };

