import { Integration, Event, Command } from '@auto-engineer/flow';
import {
  generateStructuredDataWithAI,
  AIProvider,
  z,
  getSchemaByName,
  generateTextWithAI,
} from '@auto-engineer/ai-gateway';

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
    schemaName?: string;
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
        schemaName: z.string(),
      }),
    },
    DoChat: async <T>(command: DoChat): Promise<T> => {
      const { prompt, systemPrompt, schemaName } = command.data;

      const fullPrompt = systemPrompt?.trim() != null ? `${systemPrompt.trim()}\n\n${prompt.trim()}` : prompt.trim();

      if (schemaName != null) {
        const schema = getSchemaByName(schemaName);

        if (schema) {
          return await generateStructuredDataWithAI(fullPrompt, AIProvider.Anthropic, {
            schema: schema as z.ZodSchema<T>,
            schemaName,
            schemaDescription: `AI output matching schema '${schemaName}'`,
            includeTools: true,
          });
        }
      }
      const raw = await generateTextWithAI(fullPrompt, AIProvider.Anthropic, {
        includeTools: true,
      });

      try {
        return JSON.parse(raw) as T;
      } catch (err) {
        throw new Error(
          `Failed to parse unstructured AI response: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  },
};
