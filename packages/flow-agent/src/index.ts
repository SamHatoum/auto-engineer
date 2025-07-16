import { streamStructuredDataWithAI } from '@auto-engineer/ai-gateway';
import { AIProvider } from '@auto-engineer/ai-gateway';
import {
  type CommandHandler,
  type BaseCommand,
  type AckNackResponse,
  type BaseEvent,
} from '@auto-engineer/message-bus';
import { variantPrompts } from './prompt';
import {
  FlowNamesSystemSchema,
  SliceNamesSystemSchema,
  ClientServerNamesSystemSchema,
  SpecsSystemSchema,
  type AppSchema,
} from '@auto-engineer/flowlang';
import { z } from 'zod';

export interface CreateFlowCommand extends BaseCommand {
  type: 'CreateFlow';
  prompt: string;
  variant?: 'flow-names' | 'slice-names' | 'client-server-names' | 'specs';
  streamCallback?: (partialData: unknown) => void;
  useStreaming?: boolean;
}

export interface FlowCreatedEvent extends BaseEvent {
  type: 'FlowCreated';
  systemData: AppSchema;
}

const provider = AIProvider.OpenAI;

export const createFlowCommandHandler: CommandHandler<CreateFlowCommand> = {
  name: 'CreateFlow',
  handle: async (command: CreateFlowCommand): Promise<AckNackResponse> => {
    try {
      const variant = command.variant || 'flow-names';

      const systemData: AppSchema = await generateSystemData(variant, command.prompt, command.streamCallback);

      const event: FlowCreatedEvent = {
        type: 'FlowCreated',
        systemData,
        timestamp: new Date(),
        requestId: command.requestId,
      };

      return {
        status: 'ack',
        message: JSON.stringify(event),
        timestamp: new Date(),
        requestId: command.requestId,
      };
    } catch (error) {
      return {
        status: 'nack',
        error: error instanceof Error ? error.message : 'Unknown error occurred while creating flow',
        timestamp: new Date(),
        requestId: command.requestId,
      };
    }
  },
};

// Helper function to extract detailed error information
function appendErrorDetail(details: string, key: string, value: unknown): string {
  if (value != null) {
    return `${details}\n${key}: ${JSON.stringify(value, null, 2)}`;
  }
  return details;
}

function extractErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unknown error occurred';
  }

  let errorDetails = error.message;

  if (typeof error === 'object' && error !== null) {
    errorDetails = appendErrorDetail(errorDetails, 'Cause', 'cause' in error ? error.cause : undefined);
    errorDetails = appendErrorDetail(errorDetails, 'Validation issues', 'issues' in error ? error.issues : undefined);
    errorDetails = appendErrorDetail(errorDetails, 'Errors', 'errors' in error ? error.errors : undefined);
    errorDetails = appendErrorDetail(
      errorDetails,
      'Validation Details',
      'validationDetails' in error ? error.validationDetails : undefined,
    );
    errorDetails = appendErrorDetail(
      errorDetails,
      'Zod Validation Issues',
      'zodIssues' in error ? error.zodIssues : undefined,
    );
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
  streamCallback?: (partialData: unknown) => void,
): Promise<AppSchema> {
  const enhancedPrompt = variantPrompts[variant](prompt);

  try {
    let systemData: AppSchema;

    switch (variant) {
      case 'flow-names':
        systemData = await streamStructuredDataWithAI<AppSchema>(enhancedPrompt, provider, {
          schema: FlowNamesSystemSchema,
          schemaName: 'FlowNamesSystemGeneration',
          schemaDescription:
            'Generate a flow-names variant of the FlowLang system. The variant field MUST be set to "flow-names".',
          onPartialObject: streamCallback,
        });
        break;

      case 'slice-names':
        systemData = await streamStructuredDataWithAI<AppSchema>(enhancedPrompt, provider, {
          schema: SliceNamesSystemSchema,
          schemaName: 'SliceNamesSystemGeneration',
          schemaDescription:
            'Generate a slice-names variant by expanding the given flows with slices. The variant field MUST be set to "slice-names". Each flow should have slices array with name and type fields.',
          onPartialObject: streamCallback,
        });
        break;

      case 'client-server-names':
        systemData = await streamStructuredDataWithAI<AppSchema>(enhancedPrompt, provider, {
          schema: ClientServerNamesSystemSchema,
          schemaName: 'ClientServerNamesSystemGeneration',
          schemaDescription:
            'Generate a client-server-names variant of the FlowLang system. The variant field MUST be set to "client-server-names".',
          onPartialObject: streamCallback,
        });
        break;

      case 'specs':
        systemData = (await streamStructuredDataWithAI(enhancedPrompt, provider, {
          schema: SpecsSystemSchema,
          schemaName: 'SpecsSystemGeneration',
          schemaDescription:
            'Generate a specs variant of the FlowLang system. The variant field MUST be set to "specs".',
          onPartialObject: streamCallback,
        })) as AppSchema;
        break;

      default:
        throw new Error(`Invalid variant: ${variant as string}`);
    }

    return systemData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }

    if (error instanceof Error) {
      throw new Error(`AI generation failed: ${extractErrorDetails(error)}`);
    }

    throw error;
  }
}
