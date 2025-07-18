import { Integration, Event, Command } from '@auto-engineer/flowlang';
import { generateTextWithAI, AIProvider, startServer } from '@auto-engineer/ai-gateway';

export type ChatCompleted = Event<
  'ChatCompleted',
  {
    sessionId: string;
    suggestedItems: { productId: string; name: string; quantity: number; reason: string }[];
    timestamp: Date;
  }
>;

export type DoChat = Command<
  'DoChat',
  {
    sessionId: string;
    prompt: string;
    systemPrompt?: string;
  }
>;

export const AI: Integration<'ai'> = {
  __brand: 'Integration' as const,
  type: 'ai' as const,
  name: 'AI',
  Commands: {
    DoChat: async (command: DoChat): Promise<string> => {
      const { prompt, systemPrompt } = command.data;
      const fullPrompt = systemPrompt !== undefined && systemPrompt !== ''
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
      return await generateTextWithAI(fullPrompt, AIProvider.Anthropic, { includeTools: true });
    },
  }
};

async function startMCPServer() {
  console.log('Starting MCP server');
  await startServer();
}

// Only start server when running directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer().catch(console.error);
}