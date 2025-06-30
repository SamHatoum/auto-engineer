import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";

// Define OpenAI function schemas
const functions = [
  {
    name: "getTodoItems",
    description: "Get all todo items as a JSON array",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "createTodoItem",
    description: "Create a new todo item",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text of the todo item"
        }
      },
      required: ["text"]
    }
  }
];

export class MCPTodoAgent {
  private client: Client;
  private transport: StdioClientTransport;
  private openai: OpenAI;

  constructor() {
    this.client = new Client({
      name: "mcp-todo-agent",
      version: "1.0.0"
    });

    this.transport = new StdioClientTransport({
      command: "node",
      args: ["./dist/open-ai-stdio.js"]
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async disconnect() {
    await this.transport.close();
  }

  async getCurrentTodos() {
    const result = await this.client.callTool({
      name: "getTodoItems",
      arguments: {}
    });
    return JSON.parse((result.content as any)[0].text);
  }

  async addTodoItem(text: string) {
    const result = await this.client.callTool({
      name: "createTodoItem",
      arguments: { text }
    });
    return JSON.parse((result.content as any)[0].text);
  }

  async executePromptWithAI(promptName: string, args: any) {
    const promptResponse = await this.client.getPrompt({
      name: promptName,
      arguments: args
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: promptResponse.system as string
      },
      {
        role: "user",
        content: (promptResponse.messages[0].content as any).text as string
      }
    ];

    let lastToolResult = null;
    let conversationComplete = false;
    let maxTurns = 3; // max conversation iterations
    let turnCount = 0;

    while (!conversationComplete && turnCount < maxTurns) {
      turnCount++;
      console.log(`Conversation turn ${turnCount}`);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: messages,
        tools: functions.map(f => ({ type: "function", function: f })),
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      const responseMessage = choice.message;

      if (responseMessage.tool_calls) {
        console.log(`AI wants to call ${responseMessage.tool_calls.length} tool(s):`, 
          responseMessage.tool_calls.map(tc => tc.function.name));
        
        // Add the response message with tool_calls to the conversation
        messages.push(responseMessage);
        
        for (const toolCall of responseMessage.tool_calls) {
          console.log(`🔧 Calling tool: ${toolCall.function.name}`);
          const toolResult = await this.client.callTool({
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments)
          });

          console.log(`Tool result:`, toolResult);
          lastToolResult = toolResult;

          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: (toolResult.content as any)[0].text as string,
          });
        }
        
        // Continue the conversation loop
        conversationComplete = false;
      } else {
        console.log(`AI final response:`, responseMessage.content);
        messages.push(responseMessage);
        conversationComplete = true;
      }
    }

    if (turnCount >= maxTurns) {
      console.log(`Reached maximum conversation turns (${maxTurns})`);
    }

    // Return both the AI response and the last tool result
    return {
      aiResponse: messages[messages.length - 1].content,
      toolResult: lastToolResult
    };
  }

  /**
   * Add a todo item directly using the MCP tool
   */
  async addTodoDirectly(text: string) {
    return await this.addTodoItem(text);
  }

  /**
   * Add a todo item using AI prompt (which includes duplicate checking)
   */
  async addTodoWithAI(text: string) {
    return await this.executePromptWithAI("manage-todos", {
      action: "create",
      todoText: text
    });
  }

  /**
   * Get the current list of todos
   */
  async getTodos() {
    return await this.getCurrentTodos();
  }
} 