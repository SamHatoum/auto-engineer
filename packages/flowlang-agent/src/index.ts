import 'dotenv/config';
import { generateTextStreamingWithAI, type AIProvider } from '@auto-engineer/ai-integration';
import { type CommandHandler, type BaseCommand, type AckNackResponse, type BaseEvent, server } from '@auto-engineer/api';

export type CreateFlowCommand = BaseCommand & {
  prompt: string;
  streamCallback?: (token: string) => void;
}

export type FlowCreatedEvent = BaseEvent & {
  type: 'FlowCreated';
  flow: string;
}

export const createFlowCommandHandler: CommandHandler<CreateFlowCommand> = {
  name: 'CreateFlow',
  handle: async (command: CreateFlowCommand): Promise<AckNackResponse> => {
    try {
      const flow = await generateTextStreamingWithAI(
        command.prompt,
        'openai' as AIProvider, { streamCallback: command.streamCallback });
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