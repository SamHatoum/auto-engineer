import 'dotenv/config';
import { generateStructuredDataWithAI, streamStructuredDataWithAI, type AIProvider } from '@auto-engineer/ai-integration';
import { type CommandHandler, type BaseCommand, type AckNackResponse, type BaseEvent, server } from '@auto-engineer/api';
import { prompt } from './prompt';

export type CreateFlowCommand = BaseCommand & {
  prompt: string;
  streamCallback?: (partialData: Partial<FlowData>) => void;
  useStreaming?: boolean;
}

export type FlowCreatedEvent = BaseEvent & {
  type: 'FlowCreated';
  flowData: FlowData;
}

export const createFlowCommandHandler: CommandHandler<CreateFlowCommand> = {
  name: 'CreateFlow',
  handle: async (command: CreateFlowCommand): Promise<AckNackResponse> => {
    try {
      let flowData: FlowData;

      if (command.useStreaming && command.streamCallback) {
        // Use streaming structured data generation
        flowData = await streamStructuredDataWithAI(
          `${prompt}\n\nUser Request: ${command.prompt}`,
          'openai' as AIProvider,
          {
            schema: FlowSchema,
            schemaName: 'FlowGeneration',
            schemaDescription: 'Generate a complete FlowLang implementation based on user requirements',
            onPartialObject: command.streamCallback,
          }
        );
      } else {
        // Use non-streaming structured data generation
        flowData = await generateStructuredDataWithAI(
          `${prompt}\n\nUser Request: ${command.prompt}`,
          'openai' as AIProvider,
          {
            schema: FlowSchema,
            schemaName: 'FlowGeneration',
            schemaDescription: 'Generate a complete FlowLang implementation based on user requirements',
          }
        );
      }

      const event: FlowCreatedEvent = {
        type: 'FlowCreated',
        flowData: flowData,
        timestamp: new Date(),
        requestId: command.requestId
      };
      
      server.publishEvent(event);
      
      return {
        status: 'ack',
        message: `Flow "${flowData.name}" created successfully`,
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