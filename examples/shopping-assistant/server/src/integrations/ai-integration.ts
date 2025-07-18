import { Integration, Event, Command } from '@auto-engineer/flowlang';
import { generateTextWithAI, AIProvider } from '@auto-engineer/ai-gateway';

export type ChatCompleted = Event<
  'ChatCompleted',
  {
    sessionId: string;
    suggestedItems: { productId: string; name: string; quantity: number; reason: string }[];
    timestamp: Date;
  }
>;

// configure the MCP an MCP server

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
      return await generateTextWithAI(fullPrompt, AIProvider.Anthropic);
    },
  }
};