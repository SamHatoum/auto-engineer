import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

interface ToolDescription {
  title: string;
  description: string;
  inputSchema: Record<string, z.ZodSchema>;
  schema?: z.ZodSchema;
  schemaName?: string;
  schemaDescription?: string;
}

type ToolHandler<T extends Record<string, unknown> = Record<string, unknown>> = (params: T) => Promise<ToolResult>;

interface RegisteredTool {
  name: string;
  description: ToolDescription;
  handler: ToolHandler<Record<string, unknown>>;
  aiSdkTool: {
    parameters: z.ZodSchema;
    description: string;
    execute?: (args: Record<string, unknown>) => Promise<string>;
  };
}

const server = new McpServer({
  name: 'frontend-implementation',
  version: '0.1.0',
});

const transport = new StdioServerTransport();

let isStarted = false;
const toolRegistry = new Map<string, RegisteredTool>();

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

function createMcpHandler<T extends Record<string, unknown>>(
  handler: ToolHandler<T>,
): (args: Record<string, unknown>, extra: unknown) => Promise<ToolResult> {
  return (args: Record<string, unknown>, _extra: unknown) => {
    return handler(args as T);
  };
}

function createAiSdkTool(description: ToolDescription, handler: ToolHandler) {
  // Create a Zod object schema from the input schema
  // If inputSchema is empty, create a schema that accepts
  const parameterSchema =
    Object.keys(description.inputSchema).length > 0 ? z.object(description.inputSchema) : z.object({}).passthrough();

  return {
    parameters: parameterSchema,
    description: description.description,
    execute: async (args: Record<string, unknown>) => {
      const result = await handler(args);
      return result.content[0]?.text || '';
    },
    ...(description.schema && { schema: description.schema }),
    ...(description.schemaName != null && { schemaName: description.schemaName }),
    ...(description.schemaDescription != null && { schemaDescription: description.schemaDescription }),
  };
}

export function registerTool<T extends Record<string, unknown> = Record<string, unknown>>(
  name: string,
  description: ToolDescription,
  handler: ToolHandler<T>,
) {
  if (isStarted) {
    throw new Error('Cannot register tools after server has started');
  }

  const mcpHandler = createMcpHandler(handler);
  const aiSdkTool = createAiSdkTool(description, handler as ToolHandler<Record<string, unknown>>);

  const registeredTool: RegisteredTool = {
    name,
    description,
    handler: handler as ToolHandler<Record<string, unknown>>,
    aiSdkTool,
  };

  toolRegistry.set(name, registeredTool);
  server.registerTool(name, description, mcpHandler);
}

export function registerTools<T extends Record<string, unknown> = Record<string, unknown>>(
  tools: Array<{
    name: string;
    description: ToolDescription;
    handler: ToolHandler<T>;
  }>,
) {
  if (isStarted) {
    throw new Error('Cannot register tools after server has started');
  }
  tools.forEach((tool) => {
    registerTool(tool.name, tool.description, tool.handler);
  });
}

export async function startServer() {
  if (isStarted) return;

  await server.connect(transport);
  isStarted = true;
}

export function isServerStarted() {
  return isStarted;
}

export function getRegisteredTools(): RegisteredTool[] {
  return Array.from(toolRegistry.values());
}

export function getRegisteredToolsForAI(): Record<
  string,
  {
    parameters: z.ZodSchema;
    description: string;
    execute?: (args: Record<string, unknown>) => Promise<string>;
  }
> {
  const tools: Record<
    string,
    {
      parameters: z.ZodSchema;
      description: string;
      execute?: (args: Record<string, unknown>) => Promise<string>;
    }
  > = {};
  for (const tool of toolRegistry.values()) {
    tools[tool.name] = tool.aiSdkTool;
  }
  return tools;
}

export function getToolHandler(name: string): ToolHandler | undefined {
  return toolRegistry.get(name)?.handler;
}

export async function executeRegisteredTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
  const tool = toolRegistry.get(name);
  if (!tool) {
    throw new Error(`Tool '${name}' not found`);
  }
  return await tool.handler(params);
}

export type { ToolResult, ToolDescription, ToolHandler, RegisteredTool };
