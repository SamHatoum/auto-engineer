import 'dotenv/config';
import { streamStructuredDataWithAI, type AIProvider } from '@auto-engineer/ai-integration';
import { type CommandHandler, type BaseCommand, type AckNackResponse, type BaseEvent, server } from '@auto-engineer/api';
import { prompt } from './prompt';
import {
  FlowNamesSystemSchema,
  SliceNamesSystemSchema,
  ClientServerNamesSystemSchema,
  SpecsSystemSchema,
  type AppSchema
} from '@auto-engineer/flowlang';
import { z } from 'zod';

import zodToJsonSchema from 'zod-to-json-schema';

export type CreateFlowCommand = BaseCommand & {
  prompt: string;
  variant?: 'flow-names' | 'slice-names' | 'client-server-names' | 'specs';
  streamCallback?: (partialData: any) => void;
  useStreaming?: boolean;
}

export type FlowCreatedEvent = BaseEvent & {
  type: 'FlowCreated';
  systemData: AppSchema;
}

const provider = 'anthropic' as AIProvider;

export const createFlowCommandHandler: CommandHandler<CreateFlowCommand> = {
  name: 'CreateFlow',
  handle: async (command: CreateFlowCommand): Promise<AckNackResponse> => {
    try {
      let systemData: AppSchema;
      const variant = command.variant || 'flow-names';

      console.log('variant',variant)

      const variantInstructions = {
        'flow-names': 'Generate only flow names and descriptions for initial planning.',
        'slice-names': 'Generate flows with slice names and types to define the structure.',
        'client-server-names': 'Generate flows with client and server descriptions for each slice.',
        'specs': 'Generate complete specifications with all implementation details, messages, and integrations.'
      };

      // Handle each variant separately for proper type narrowing
      switch (variant) {
        case 'flow-names': {
          const enhancedPrompt = `${prompt}
            IMPORTANT: Generate a "${variant}" variant of the system.
            ${variantInstructions[variant]}

            CRITICAL CONSTRAINTS:
            1. The variant field in your output MUST be set to "flow-names"
            2. Generate a maximum of 4 flows at a time
            3. If you are provided with a list of flows from a previous run, then you should build on them and expand the feature set
            
            User Request: ${command.prompt}`;
          let result;
          try {
                          result = await streamStructuredDataWithAI(
                enhancedPrompt,
                provider,
                {
                  schema: FlowNamesSystemSchema,
                  schemaName: 'FlowNamesSystemGeneration',
                  schemaDescription: `Generate a flow-names variant of the FlowLang system. The variant field MUST be set to "flow-names".`,
                  onPartialObject: command.streamCallback,
                }
              );
          } catch (error) {
            // Handle errors from the AI generation itself
            if (error instanceof Error) {
              // Extract detailed error information
              let errorDetails = error.message;
              
              // Check if the error has additional properties with validation details
              const errorObj = error as any;
              if (errorObj.cause) {
                errorDetails += `\nCause: ${JSON.stringify(errorObj.cause, null, 2)}`;
              }
              if (errorObj.issues) {
                errorDetails += `\nValidation issues: ${JSON.stringify(errorObj.issues, null, 2)}`;
              }
              if (errorObj.errors) {
                errorDetails += `\nErrors: ${JSON.stringify(errorObj.errors, null, 2)}`;
              }
              if (errorObj.validationDetails) {
                errorDetails += `\nValidation Details: ${JSON.stringify(errorObj.validationDetails, null, 2)}`;
              }
              if (errorObj.zodIssues) {
                errorDetails += `\nZod Validation Issues: ${JSON.stringify(errorObj.zodIssues, null, 2)}`;
              }
              
              // Try to extract Zod validation errors if they exist
              if (error.message.includes('response did not match schema')) {
                errorDetails += '\nNote: The AI response did not match the expected schema structure.';
              }
              
              return {
                status: 'nack',
                error: `AI generation failed: ${errorDetails}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          
          // Validate the result
          try {
            systemData = FlowNamesSystemSchema.parse(result);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return {
                status: 'nack',
                error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          break;
        }
        case 'slice-names': {
          const enhancedPrompt = `${prompt}
            IMPORTANT: Generate a "${variant}" variant of the system.
            ${variantInstructions[variant]}

            You are given a flow-names variant output below. Your task is to EXPAND each of these flows by adding slices.
            For each flow, create appropriate slices (command, query, or react types) that implement the flow's functionality.

          
            CRITICAL: 
            - The variant field in your output MUST be set to "slice-names" (NOT "flow-names")
            - Keep the SAME flow names as provided above.
            - Keep the SAME flow descriptions as provided above.
            - Add the slices that make the flow complete with appropriate types (command/query/react)
            - Each slice should have a descriptive name and type
            - Do NOT change the flow names or generate new flows

            User Request: ${command.prompt}`;
          let result;
          try {
            result = await streamStructuredDataWithAI(
              enhancedPrompt,
              provider,
              {
                schema: SliceNamesSystemSchema,
                schemaName: 'SliceNamesSystemGeneration',
                schemaDescription: `Generate a slice-names variant by expanding the given flows with slices. The variant field MUST be set to "slice-names". Each flow should have slices array with name and type fields.`,
                onPartialObject: command.streamCallback,
              }
            );
          } catch (error) {
            // Handle errors from the AI generation itself
            if (error instanceof Error) {
              // Extract detailed error information
              let errorDetails = error.message;
              
              // Check if the error has additional properties with validation details
              const errorObj = error as any;
              if (errorObj.cause) {
                errorDetails += `\nCause: ${JSON.stringify(errorObj.cause, null, 2)}`;
              }
              if (errorObj.issues) {
                errorDetails += `\nValidation issues: ${JSON.stringify(errorObj.issues, null, 2)}`;
              }
              if (errorObj.errors) {
                errorDetails += `\nErrors: ${JSON.stringify(errorObj.errors, null, 2)}`;
              }
              if (errorObj.validationDetails) {
                errorDetails += `\nValidation Details: ${JSON.stringify(errorObj.validationDetails, null, 2)}`;
              }
              if (errorObj.zodIssues) {
                errorDetails += `\nZod Validation Issues: ${JSON.stringify(errorObj.zodIssues, null, 2)}`;
              }
              
              // Try to extract Zod validation errors if they exist
              if (error.message.includes('response did not match schema')) {
                errorDetails += '\nNote: The AI response did not match the expected schema structure.';
              }
              
              return {
                status: 'nack',
                error: `AI generation failed: ${errorDetails}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          
          // Validate the result
          try {
            systemData = SliceNamesSystemSchema.parse(result);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return {
                status: 'nack',
                error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          break;
        }
        case 'client-server-names': {
          const enhancedPrompt = `${prompt}
            IMPORTANT: Generate a "${variant}" variant of the system.
            ${variantInstructions[variant]}

            CRITICAL CONSTRAINTS:
            - The variant field in your output MUST be set to "client-server-names"

            User Request: ${command.prompt}`;
          let result;
          try {
            result = await streamStructuredDataWithAI(
              enhancedPrompt,
              provider,
              {
                schema: ClientServerNamesSystemSchema,
                schemaName: 'ClientServerNamesSystemGeneration',
                schemaDescription: `Generate a client-server-names variant of the FlowLang system. The variant field MUST be set to "client-server-names".`,
                onPartialObject: command.streamCallback,
              }
            );
          } catch (error) {
            // Handle errors from the AI generation itself
            if (error instanceof Error) {
              // Extract detailed error information
              let errorDetails = error.message;
              
              // Check if the error has additional properties with validation details
              const errorObj = error as any;
              if (errorObj.cause) {
                errorDetails += `\nCause: ${JSON.stringify(errorObj.cause, null, 2)}`;
              }
              if (errorObj.issues) {
                errorDetails += `\nValidation issues: ${JSON.stringify(errorObj.issues, null, 2)}`;
              }
              if (errorObj.errors) {
                errorDetails += `\nErrors: ${JSON.stringify(errorObj.errors, null, 2)}`;
              }
              if (errorObj.validationDetails) {
                errorDetails += `\nValidation Details: ${JSON.stringify(errorObj.validationDetails, null, 2)}`;
              }
              if (errorObj.zodIssues) {
                errorDetails += `\nZod Validation Issues: ${JSON.stringify(errorObj.zodIssues, null, 2)}`;
              }
              
              // Try to extract Zod validation errors if they exist
              if (error.message.includes('response did not match schema')) {
                errorDetails += '\nNote: The AI response did not match the expected schema structure.';
              }
              
              return {
                status: 'nack',
                error: `AI generation failed: ${errorDetails}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          
          // Validate the result
          try {
            systemData = ClientServerNamesSystemSchema.parse(result);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return {
                status: 'nack',
                error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          break;
        }

        case 'specs': {
          const enhancedPrompt = `${prompt}
            IMPORTANT: Generate a "${variant}" variant of the system.
            ${variantInstructions[variant]}

            CRITICAL CONSTRAINTS:
            - The variant field in your output MUST be set to "specs"
            
            IMPORTANT MESSAGE REFERENCES:
            - Define all messages (commands, events, states) in the top-level "messages" array
            - In GWT sections, reference messages by name only, do NOT include full definitions
            
            IMPORTANT STRUCTURE for command slices gwt:
            - gwt.when should contain a CommandExampleSchema with:
              - commandRef: the NAME of the command (e.g., "CreateListing")
              - exampleData: an object with example values for the command
            - gwt.then should be an ARRAY at the same level as when (not nested inside when)
            - Each item in gwt.then should have:
              - eventRef: the NAME of the event (e.g., "ListingCreated")
              - exampleData: example values for that event
              
            IMPORTANT STRUCTURE for query slices gwt:
            - gwt.given should be an array of EventExampleSchema objects with:
              - eventRef: the NAME of the event
              - exampleData: example values
            - gwt.then should be an array of StateExampleSchema objects with:
              - stateRef: the NAME of the state/read model
              - exampleData: example values
            
            IMPORTANT STRUCTURE for react slices gwt:
            - gwt.when should be an array of EventExampleSchema objects with:
              - eventRef: the NAME of the event
              - exampleData: example values
            - gwt.then should be an array of CommandExampleSchema objects with:
              - commandRef: the NAME of the command
              - exampleData: example values
            
            IMPORTANT: Do NOT include "messages" arrays inside individual slices.
            The "messages" array should only appear at the top level of the system,
            alongside "flows" and "integrations".
            
            EXAMPLE of correct reference usage:
            {
              "eventRef": "UserRegistered",
              "exampleData": {
                "userId": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com"
              }
            }

            User Request: ${command.prompt}`;
          
          let result;
          try {
            result = await streamStructuredDataWithAI(
              enhancedPrompt,
              'openai' as AIProvider,
              {
                schema: SpecsSystemSchema,
                schemaName: 'SpecsSystemGeneration',
                schemaDescription: `Generate a specs variant of the FlowLang system. The variant field MUST be set to "specs".`,
                onPartialObject: command.streamCallback,
              }
            );
          } catch (error) {
            // Handle errors from the AI generation itself
            if (error instanceof Error) {
              // Extract detailed error information
              let errorDetails = error.message;
              
              // Check if the error has additional properties with validation details
              const errorObj = error as any;
              if (errorObj.cause) {
                errorDetails += `\nCause: ${JSON.stringify(errorObj.cause, null, 2)}`;
              }
              if (errorObj.issues) {
                errorDetails += `\nValidation issues: ${JSON.stringify(errorObj.issues, null, 2)}`;
              }
              if (errorObj.errors) {
                errorDetails += `\nErrors: ${JSON.stringify(errorObj.errors, null, 2)}`;
              }
              if (errorObj.validationDetails) {
                errorDetails += `\nValidation Details: ${JSON.stringify(errorObj.validationDetails, null, 2)}`;
              }
              if (errorObj.zodIssues) {
                errorDetails += `\nZod Validation Issues: ${JSON.stringify(errorObj.zodIssues, null, 2)}`;
              }
              
              // Try to extract Zod validation errors if they exist
              if (error.message.includes('response did not match schema')) {
                errorDetails += '\nNote: The AI response did not match the expected schema structure.';
              }
              
              return {
                status: 'nack',
                error: `AI generation failed: ${errorDetails}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          
          // Validate the result
          try {
            systemData = SpecsSystemSchema.parse(result);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return {
                status: 'nack',
                error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
                timestamp: new Date(),
                requestId: command.requestId
              };
            }
            throw error;
          }
          break;
        }

        default:
          throw new Error(`Invalid variant: ${variant}`);
      }

      const event: FlowCreatedEvent = {
        type: 'FlowCreated',
        systemData: systemData,
        timestamp: new Date(),
        requestId: command.requestId
      };

      server.publishEvent(event);
      console.log('output\n-----\n', JSON.stringify(event.systemData), '\n-----')

      const flowCount = systemData.flows.length;
      const flowNames = systemData.flows.map((f: any) => f.name).join(', ');

      return {
        status: 'ack',
        message: `System with ${flowCount} flow(s) created successfully: ${flowNames}`,
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