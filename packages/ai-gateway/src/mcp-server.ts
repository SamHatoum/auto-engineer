import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import createDebug from 'debug';

const debug = createDebug('ai-gateway:mcp');
const debugServer = createDebug('ai-gateway:mcp:server');
const debugTools = createDebug('ai-gateway:mcp:tools');
const debugRegistry = createDebug('ai-gateway:mcp:registry');
const debugExecution = createDebug('ai-gateway:mcp:execution');

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

debugServer('Creating MCP server instance - name: frontend-implementer, version: 0.1.0');
const server = new McpServer({
  name: 'frontend-implementer',
  version: '0.1.0',
});

const transport = new StdioServerTransport();
debugServer('StdioServerTransport created');

let isStarted = false;
const toolRegistry = new Map<string, RegisteredTool>();
debugRegistry('Tool registry initialized');

async function cleanup() {
  debug('Cleanup initiated');
  console.log('Cleaning up...');
  await transport.close();
  debugServer('Transport closed');
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
    debugExecution('MCP handler invoked with args: %o', args);
    return handler(args as T);
  };
}

function createAiSdkTool(description: ToolDescription, handler: ToolHandler) {
  const parameterSchema =
    Object.keys(description.inputSchema).length > 0 ? z.object(description.inputSchema) : z.object({}).passthrough();

  debugTools('Creating AI SDK tool with %d parameters', Object.keys(description.inputSchema).length);

  return {
    parameters: parameterSchema,
    description: description.description,
    execute: async (args: Record<string, unknown>) => {
      debugExecution('AI SDK tool execute called with args: %o', args);
      const result = await handler(args);
      const textOutput = result.content[0]?.text || '';
      debugExecution('Tool execution result length: %d', textOutput.length);

      // If a schema is provided, parse and validate the JSON output
      if (description.schema) {
        try {
          const parsed = JSON.parse(textOutput) as unknown;
          description.schema.parse(parsed);
          debugExecution('Tool output validated against schema successfully');
          return textOutput; // Return original text output for consistency
        } catch (parseError) {
          debugExecution('Tool failed to parse/validate JSON output: %O', parseError);
          return textOutput; // Fallback to raw text
        }
      }

      return textOutput;
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
  debugRegistry('Registering MCP tool: %s', name);
  console.log(`🔧 Registering MCP tool: ${name}`);

  if (isStarted) {
    debugRegistry('ERROR: Cannot register tool %s after server has started', name);
    throw new Error('Cannot register tools after server has started');
  }

  // Check if tool is already registered to avoid duplicate registration errors
  if (toolRegistry.has(name)) {
    debugRegistry('Tool %s is already registered, skipping registration', name);
    console.log(`Tool ${name} is already registered, skipping registration. Total tools: ${toolRegistry.size}`);
    return;
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

  // Try to register with the underlying server, but catch and ignore duplicate registration errors
  try {
    server.registerTool(name, description, mcpHandler);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already registered')) {
      debugRegistry('Tool %s already registered in underlying server, ignoring error', name);
      console.log(`⚠️ Tool ${name} already registered in underlying server, ignoring duplicate registration error`);
    } else {
      // Re-throw any other errors
      throw error;
    }
  }
  debugRegistry('Tool %s registered successfully. Total tools: %d', name, toolRegistry.size);
  console.log(`✅ Tool ${name} registered successfully. Total tools: ${toolRegistry.size}`);
}

export function registerTools<T extends Record<string, unknown> = Record<string, unknown>>(
  tools: Array<{
    name: string;
    description: ToolDescription;
    handler: ToolHandler<T>;
  }>,
) {
  debugRegistry('Batch registering %d tools', tools.length);
  if (isStarted) {
    debugRegistry('ERROR: Cannot register tools after server has started');
    throw new Error('Cannot register tools after server has started');
  }
  tools.forEach((tool) => {
    registerTool(tool.name, tool.description, tool.handler);
  });
  debugRegistry('Batch registration complete');
}

export async function startServer() {
  if (isStarted) {
    debugServer('Server already started, skipping');
    return;
  }

  debugServer('Starting MCP server...');
  await server.connect(transport);
  isStarted = true;
  debugServer('MCP server started successfully');
}

export function isServerStarted() {
  debugServer('Checking server status: %s', isStarted ? 'started' : 'not started');
  return isStarted;
}

export function getRegisteredTools(): RegisteredTool[] {
  const tools = Array.from(toolRegistry.values());
  debugRegistry('Getting all registered tools: %d tools', tools.length);
  return tools;
}

export function getRegisteredToolsForAI(): Record<
  string,
  {
    parameters: z.ZodSchema;
    description: string;
    execute?: (args: Record<string, unknown>) => Promise<string>;
  }
> {
  debugRegistry('Getting registered tools for AI. Registry size: %d', toolRegistry.size);
  console.log(`📋 Getting registered tools for AI. Registry size: ${toolRegistry.size}`);
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
    debugRegistry('  - Tool: %s', tool.name);
    console.log(`  - Tool: ${tool.name}`);
  }
  debugRegistry('Returning %d tools for AI', Object.keys(tools).length);
  console.log(`📊 Returning ${Object.keys(tools).length} tools for AI`);
  return tools;
}

export function getToolHandler(name: string): ToolHandler | undefined {
  const handler = toolRegistry.get(name)?.handler;
  debugRegistry('Getting tool handler for %s: %s', name, handler ? 'found' : 'not found');
  return handler;
}

export async function executeRegisteredTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
  debugExecution('Executing registered tool: %s with params: %o', name, params);
  const tool = toolRegistry.get(name);
  if (!tool) {
    debugExecution('ERROR: Tool %s not found', name);
    throw new Error(`Tool '${name}' not found`);
  }
  const result = await tool.handler(params);
  debugExecution('Tool %s executed successfully', name);
  return result;
}

export function getSchemaByName(schemaName: string): z.ZodSchema | undefined {
  debugRegistry('Looking for schema with name: %s', schemaName);
  for (const tool of toolRegistry.values()) {
    if (tool.description?.schemaName === schemaName) {
      debugRegistry('Schema %s found in tool %s', schemaName, tool.name);
      return tool.description.schema;
    }
  }
  debugRegistry('Schema %s not found', schemaName);
  return undefined;
}

export type { ToolResult, ToolDescription, ToolHandler, RegisteredTool };
