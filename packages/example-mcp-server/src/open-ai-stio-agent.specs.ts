import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTodoAgent } from './open-ai-stio-agent.js';

// Proof of Concept Tests - These require an OpenAI API key
// Run with: npm run test:poc
const hasApiKey = !!process.env.OPENAI_API_KEY;

(hasApiKey ? describe : describe.skip)('MCP Todo Agent - Proof of Concept', () => {
  let agent: MCPTodoAgent;

  beforeAll(async () => {
    console.log('Starting MCP Todo Agent Proof of Concept tests...');
    agent = new MCPTodoAgent();
    await agent.connect();
  });

  afterAll(async () => {
    if (agent) {
      await agent.disconnect();
      console.log('Proof of Concept tests completed');
    }
  });

  describe('Direct Todo Operations', () => {
    it('should add a new todo item directly', async () => {
      // Get initial state
      const initialTodos = await agent.getTodos();
      const initialCount = initialTodos.count;

      // Add a new unique item
      const newItem = "Learn TypeScript";
      const result = await agent.addTodoDirectly(newItem);

      // Verify the item was added
      expect(result.todos).toContain(newItem);
      expect(result.count).toBe(initialCount + 1);
      expect(result.lastAdded).toBe(newItem);
    });

    it('should retrieve current todos', async () => {
      const result = await agent.getTodos();
      
      expect(result).toHaveProperty('todos');
      expect(result['todos'][0]).toBe('Buy milk');
      expect(result['todos'][1]).toBe('Walk the dog');
      expect(result['todos'][2]).toBe('Book hotel');
      expect(result['todos'][3]).toBe('Learn TypeScript');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('_meta');
    });
  });

  describe('AI-Powered Todo Operations', () => {
    it('should add a new todo item using AI prompt', async () => {
      // Get initial state
      const initialTodos = await agent.getTodos();
      const initialCount = initialTodos.count;

      // Add a new unique item using AI
      const newItem = "Practice coding";
      const result = await agent.addTodoWithAI(newItem);
      expect(result).toBeDefined()
      // Verify the item was actually added
      const finalTodos = await agent.getTodos();
      expect(finalTodos.todos).toContain(newItem);
      expect(finalTodos.count).toBe(initialCount + 1);
    }, 30000); // 30 second timeout for AI operations


    it('should prevent adding duplicate items using AI prompt', async () => {
      // Get initial state
      const initialTodos = await agent.getTodos();
      const initialCount = initialTodos.count;

      // Pick an existing item to try to duplicate
      const existingItem = initialTodos.todos[0];
      expect(existingItem).toBeTruthy();

      // Count initial occurrences
      const initialOccurrences = initialTodos.todos.filter((todo: string) => todo === existingItem).length;

      // Attempt to add the same item using AI
      const result = await agent.addTodoWithAI(existingItem);

      // Verify the AI response indicates duplicate prevention
      expect(result.aiResponse).toBeTruthy();
      expect(typeof result.aiResponse).toBe('string');

      // Verify no duplicate was added
      const finalTodos = await agent.getTodos();
      const finalOccurrences = finalTodos.todos.filter((todo: string) => todo === existingItem).length;
      
      expect(finalOccurrences).toBe(initialOccurrences);
      expect(finalTodos.count).toBe(initialCount);
    }, 30000); // 30 second timeout for AI operations
  });

}); 