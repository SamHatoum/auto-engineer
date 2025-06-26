import { generateTextStreamingWithAI, type AIProvider, type AIOptions, loadConfig, validateConfig } from '@auto-engineer/ai-integration';
import type { CommandHandler, BaseCommand, AckNackResponse, BaseEvent } from '@auto-engineer/api';
import { server } from '@auto-engineer/api';
import 'dotenv/config';

const config = loadConfig();
validateConfig(config);

export type CreateFlowCommand = BaseCommand & {
  prompt: string;
  streamCallback?: (token: string) => void;
}

export type FlowCreatedEvent = BaseEvent & {
  type: 'FlowCreated';
  flow: string;
}

export const createFlowHandler: CommandHandler<CreateFlowCommand> = {
  name: 'CreateFlow',
  handle: async (command: CreateFlowCommand): Promise<AckNackResponse> => {
    const prompt = command.prompt;
    const provider = 'openai' as AIProvider; // 'openai', 'anthropic', 'google', 'xai'
    const options: AIOptions = {
      model: undefined, // undefined to use default model for provider
      temperature: 0.7,
      maxTokens: 1000,
      streamCallback: command.streamCallback
    };

    try {
      const flow = await generateTextStreamingWithAI(prompt, provider, options);
      const event: FlowCreatedEvent = {
        type: 'FlowCreated',
        flow: flow,
        timestamp: new Date(),
        requestId: command.requestId
      };
      server.publishEvent(event);

      return {
        status: 'ack',
        message: `Flow created successfully`,
        timestamp: new Date(),
        requestId: command.requestId
      };
    } catch (error) {
      return {
        status: 'nack',
        error: error instanceof Error ? error.message : 'Unknown error occurred while creating flow',
        timestamp: new Date(),
        requestId: command.requestId
      };
    }
  }
};