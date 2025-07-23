import { Integration, Event, Command } from '@auto-engineer/flowlang';
import { generateTextWithAI, AIProvider, z } from '@auto-engineer/ai-gateway';

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

type AICommands = {
  DoChat: <T>(command: DoChat) => Promise<T>;
};

export const AI: Integration<'ai', Record<string, never>, AICommands> = {
  __brand: 'Integration' as const,
  type: 'ai' as const,
  name: 'AI',
  Commands: {
    schema: {
      DoChat: z.object({
        sessionId: z.string(),
        prompt: z.string(),
        systemPrompt: z.string().optional(),
      }),
    },
    DoChat: async <T>(command: DoChat): Promise<T> => {
      const { prompt, systemPrompt } = command.data;
      const fullPrompt =
        systemPrompt?.trim() != null && systemPrompt !== ''
          ? `${systemPrompt.trim()}\n\n${prompt.trim()}`
          : prompt.trim();

      const raw = await generateTextWithAI(fullPrompt, AIProvider.Anthropic, {
        includeTools: true,
      });
      try {
        return JSON.parse(raw) as T;
      } catch (err) {
        throw new Error(
          `Failed to parse AI response into expected shape: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  },
};
