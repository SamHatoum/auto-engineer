import { streamStructuredDataWithAI, type AIProvider } from '@auto-engineer/ai-integration';
import { type CommandHandler, type BaseCommand, type AckNackResponse, type BaseEvent } from '@auto-engineer/message-bus';
import { variantPrompts } from './prompt';
import {
  FlowNamesSystemSchema,
  SliceNamesSystemSchema,
  ClientServerNamesSystemSchema,
  SpecsSystemSchema,
  type AppSchema
} from '@auto-engineer/flowlang';
import { z } from 'zod';

export type CreateFlowCommand = BaseCommand & {
  type: 'CreateFlow';
  prompt: string;
  variant?: 'flow-names' | 'slice-names' | 'client-server-names' | 'specs';
  streamCallback?: (partialData: any) => void;
  useStreaming?: boolean;
}

export type FlowCreatedEvent = BaseEvent & {
  type: 'FlowCreated';
  systemData: AppSchema;
}

const provider = 'openai' as AIProvider;

export const createFlowCommandHandler: CommandHandler<CreateFlowCommand> = {
  name: 'CreateFlow',
  handle: async (command: CreateFlowCommand): Promise<AckNackResponse> => {
    try {
      const variant = command.variant || 'flow-names';

      const systemData = await generateSystemData(variant, command.prompt, command.streamCallback);

      const event: FlowCreatedEvent = {
        type: 'FlowCreated',
        systemData: systemData,
        timestamp: new Date(),
        requestId: command.requestId
      };

      return {
        status: 'ack',
        message: JSON.stringify(event),
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


// Helper function to extract detailed error information
function extractErrorDetails(error: any): string {
  let errorDetails = error.message;

  if (error.cause) {
    errorDetails += `\nCause: ${JSON.stringify(error.cause, null, 2)}`;
  }
  if (error.issues) {
    errorDetails += `\nValidation issues: ${JSON.stringify(error.issues, null, 2)}`;
  }
  if (error.errors) {
    errorDetails += `\nErrors: ${JSON.stringify(error.errors, null, 2)}`;
  }
  if (error.validationDetails) {
    errorDetails += `\nValidation Details: ${JSON.stringify(error.validationDetails, null, 2)}`;
  }
  if (error.zodIssues) {
    errorDetails += `\nZod Validation Issues: ${JSON.stringify(error.zodIssues, null, 2)}`;
  }

  // Try to extract Zod validation errors if they exist
  if (error.message.includes('response did not match schema')) {
    errorDetails += '\nNote: The AI response did not match the expected schema structure.';
  }

  return errorDetails;
}

// Helper function to generate system data for a variant
async function generateSystemData(
  variant: 'flow-names' | 'slice-names' | 'client-server-names' | 'specs',
  prompt: string,
  streamCallback?: (partialData: any) => void
): Promise<AppSchema> {
  const enhancedPrompt = variantPrompts[variant](prompt);

  try {
    let result: any;
    let systemData: AppSchema;

    switch (variant) {
      case 'flow-names':
        result = await streamStructuredDataWithAI(
          enhancedPrompt,
          provider,
          {
            schema: FlowNamesSystemSchema,
            schemaName: 'FlowNamesSystemGeneration',
            schemaDescription: 'Generate a flow-names variant of the FlowLang system. The variant field MUST be set to "flow-names".',
            onPartialObject: streamCallback,
          }
        );
        systemData = FlowNamesSystemSchema.parse(result);
        break;

      case 'slice-names':
        result = await streamStructuredDataWithAI(
          enhancedPrompt,
          provider,
          {
            schema: SliceNamesSystemSchema,
            schemaName: 'SliceNamesSystemGeneration',
            schemaDescription: 'Generate a slice-names variant by expanding the given flows with slices. The variant field MUST be set to "slice-names". Each flow should have slices array with name and type fields.',
            onPartialObject: streamCallback,
          }
        );
        systemData = SliceNamesSystemSchema.parse(result);
        break;

      case 'client-server-names':
        result = await streamStructuredDataWithAI(
          enhancedPrompt,
          provider,
          {
            schema: ClientServerNamesSystemSchema,
            schemaName: 'ClientServerNamesSystemGeneration',
            schemaDescription: 'Generate a client-server-names variant of the FlowLang system. The variant field MUST be set to "client-server-names".',
            onPartialObject: streamCallback,
          }
        );
        systemData = ClientServerNamesSystemSchema.parse(result);
        break;

      case 'specs':
        result = await streamStructuredDataWithAI(
          enhancedPrompt,
          'openai' as AIProvider,
          {
            schema: SpecsSystemSchema,
            schemaName: 'SpecsSystemGeneration',
            schemaDescription: 'Generate a specs variant of the FlowLang system. The variant field MUST be set to "specs".',
            onPartialObject: streamCallback,
          }
        );
        systemData = SpecsSystemSchema.parse(result);
        break;

      default:
        throw new Error(`Invalid variant: ${variant}`);
    }

    return systemData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }

    if (error instanceof Error) {
      throw new Error(`AI generation failed: ${extractErrorDetails(error)}`);
    }

    throw error;
  }
}