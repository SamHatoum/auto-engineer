import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import { FrontendScaffoldBuilder } from '../builder';
import { generateComponents } from '../generator/generateComponents';
import { writeGqlOperationsToFolder } from '../scaffold-gql-operations';
import { generateSchemaFile } from '../write-graphql-schema';
import { runCodegen } from '../run-codegen';
import { IAScheme } from '../types';

export type GenerateClientCommand = Command<
  'GenerateClient',
  {
    starterDir: string;
    designSystemDir: string;
    targetDir: string;
    iaSchemaPath: string;
    gqlSchemaPath: string;
  }
>;

export type ClientGeneratedEvent = Event<
  'ClientGenerated',
  {
    targetDir: string;
  }
>;

export type ClientGenerationFailedEvent = Event<
  'ClientGenerationFailed',
  {
    error: string;
    targetDir: string;
  }
>;

export async function handleGenerateClientCommand(
  command: GenerateClientCommand,
): Promise<ClientGeneratedEvent | ClientGenerationFailedEvent> {
  const { starterDir, designSystemDir, targetDir, iaSchemaPath, gqlSchemaPath } = command.data;

  try {
    console.log('designSystemDir', designSystemDir);

    // Build frontend scaffold
    const builder = new FrontendScaffoldBuilder();
    await builder.cloneStarter(starterDir, designSystemDir);
    await builder.build(targetDir);

    // Read and parse IA schema
    const iaSchemeJsonFile = await fs.readFile(iaSchemaPath, 'utf-8');
    const iaSchemeJson = JSON.parse(iaSchemeJsonFile) as IAScheme;

    // Generate components from IA schema
    generateComponents(iaSchemeJson, `${targetDir}/src`);

    // Write GraphQL operations
    writeGqlOperationsToFolder(iaSchemeJson, `${targetDir}/src`);

    // Generate GraphQL schema file
    generateSchemaFile(gqlSchemaPath, targetDir);

    // Run codegen
    runCodegen(targetDir);

    return {
      type: 'ClientGenerated',
      data: {
        targetDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to generate client:', error);

    return {
      type: 'ClientGenerationFailed',
      data: {
        error: errorMessage,
        targetDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const generateClientCommandHandler: CommandHandler<GenerateClientCommand> = {
  name: 'GenerateClient',
  handle: async (command: GenerateClientCommand): Promise<void> => {
    const result = await handleGenerateClientCommand(command);
    if (result.type === 'ClientGenerated') {
      console.log('Client generated successfully');
    } else {
      console.error(`Failed: ${result.data.error}`);
    }
  },
};
