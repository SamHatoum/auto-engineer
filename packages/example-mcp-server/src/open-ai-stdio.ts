import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// In-memory storage for todos
const todos: string[] = [
  "Buy milk",
  "Walk the dog",
  "Book hotel"
];

// Create an MCP server
const server = new McpServer({
  name: "auto-engineer",
  version: "0.0.1"
});

// Register tools
server.registerTool(
  "getTodoItems",
  {
    title: "Get Todo Items",
    description: "Get all todo items as a JSON array",
    inputSchema: {}
  },
  async () => {
    try {
      const todoData = {
        todos,
        count: todos.length,
        _meta: {
          audience: "assistant",
          format: "json",
          category: "data",
          source: {
            name: "todo-storage",
            type: "in-memory"
          }
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(todoData, null, 2),
          _meta: {
            audience: "assistant",
            format: "json",
            category: "data",
            source: {
              name: "todo-storage",
              type: "in-memory"
            }
          }
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error getting todos: ${error instanceof Error ? error.message : String(error)}`,
          _meta: {
            audience: "user",
            format: "text",
            category: "error"
          }
        }]
      };
    }
  }
);

server.registerTool(
  "createTodoItem",
  {
    title: "Create Todo Item",
    description: "Create a new todo item. Returns the updated list of todos.",
    inputSchema: {
      text: z.string().min(1, "Todo text cannot be empty")
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async ({ text }: { text: string }) => {
    try {

      // Add the new todo
      todos.push(text);

      const todoData = {
        todos,
        count: todos.length,
        lastAdded: text,
        _meta: {
          audience: "assistant",
          format: "json",
          category: "data",
          source: {
            name: "todo-storage",
            type: "in-memory"
          }
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(todoData, null, 2),
          _meta: {
            audience: "assistant",
            format: "json",
            category: "data",
            source: {
              name: "todo-storage",
              type: "in-memory"
            }
          }
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error creating todo: ${error instanceof Error ? error.message : String(error)}`,
          _meta: {
            audience: "user",
            format: "text",
            category: "error"
          }
        }]
      };
    }
  }
);

// Register prompts
server.registerPrompt(
  "manage-todos",
  {
    title: "Manage Todos",
    description: "Manage todo items with duplicate checking",
    argsSchema: {
      action: z.enum(["create"]),
      todoText: z.string(),
    },
  },
  ({ action, todoText }: { action: "create"; todoText: string }) => ({
    system: `You are an assistant that manages todos. You have access to these tools:
1. getTodoItems - Fetches all existing todos.
2. createTodoItem - Creates a new todo item.

Rules:
- Before adding a todo, check with getTodoItems to ensure it's not a duplicate.
- Only call createTodoItem if no similar item already exists.
- Show the user the reasoning you used.
- Print the list of todos after each action.`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please ${action} this todo item: "${todoText}"`
        }
      }
    ]
  })
);

// Start the server
const transport = new StdioServerTransport();

// Register cleanup handlers
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

async function cleanup() {
  console.log("Cleaning up...");
  await transport.close();
  process.exit(0);
}

// Connect and start listening
async function startServer() {
  await server.connect(transport);
  console.error("Todo MCP Server running on stdio");
}

startServer().catch(console.error); 