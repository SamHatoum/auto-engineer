import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import { FrontendScaffoldBuilder } from '../builder';
import { generateComponents } from '../generator/generateComponents';
import { writeGqlOperationsToFolder } from '../scaffold-gql-operations';
import { generateSchemaFile } from '../write-graphql-schema';
import { runCodegen } from '../run-codegen';
import { IAScheme } from '../types';
import { configureStarter } from '../configure-starter';
import createDebug from 'debug';

const debug = createDebug('react-graphql-generator:command');
const debugBuilder = createDebug('react-graphql-generator:command:builder');
const debugGeneration = createDebug('react-graphql-generator:command:generation');

export type GenerateClientCommand = Command<
  'GenerateClient',
  {
    starterDir: string;
    targetDir: string;
    iaSchemaPath: string;
    gqlSchemaPath: string;
    figmaVariablesPath: string;
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

async function handleGenerateClientCommandInternal(
  command: GenerateClientCommand,
): Promise<ClientGeneratedEvent | ClientGenerationFailedEvent> {
  const { starterDir, targetDir, iaSchemaPath, gqlSchemaPath, figmaVariablesPath } = command.data;
  debug('Handling GenerateClient command - requestId: %s, correlationId: %s', command.requestId, command.correlationId);
  debug(
    'Command data - starterDir: %s, targetDir: %s, iaSchemaPath: %s, gqlSchemaPath: %s, figmaVariablesPath: %s',
    starterDir,
    targetDir,
    iaSchemaPath,
    gqlSchemaPath,
    figmaVariablesPath,
  );

  try {
    // Build frontend scaffold
    debugBuilder('Creating FrontendScaffoldBuilder');
    const builder = new FrontendScaffoldBuilder();

    debugBuilder('Cloning starter from: %s', starterDir);
    await builder.cloneStarter(starterDir);

    debugBuilder('Building to target: %s', targetDir);
    await builder.build(targetDir);
    debugBuilder('Build complete');

    // Read and parse IA schema
    debugGeneration('Reading IA schema from: %s', iaSchemaPath);
    const iaSchemeJsonFile = await fs.readFile(iaSchemaPath, 'utf-8');
    debugGeneration('IA schema file size: %d bytes', iaSchemeJsonFile.length);
    const iaSchemeJson = JSON.parse(iaSchemeJsonFile) as IAScheme;
    debugGeneration('IA schema parsed successfully');

    // Generate components from IA schema
    debugGeneration('Generating components to: %s/src', targetDir);
    generateComponents(iaSchemeJson, `${targetDir}/src`);
    debugGeneration('Components generated');

    // Write GraphQL operations
    debugGeneration('Writing GraphQL operations to: %s/src', targetDir);
    writeGqlOperationsToFolder(iaSchemeJson, `${targetDir}/src`);
    debugGeneration('GraphQL operations written');

    // Generate GraphQL schema file
    debugGeneration('Generating GraphQL schema from: %s', gqlSchemaPath);
    generateSchemaFile(gqlSchemaPath, targetDir);
    debugGeneration('GraphQL schema generated');

    // Run codegen
    debugGeneration('Running codegen in: %s', targetDir);
    runCodegen(targetDir);
    debugGeneration('Codegen complete');

    // Configure starter
    debugGeneration('Configuring starter with Figma variables: %s', figmaVariablesPath);
    configureStarter(figmaVariablesPath, targetDir);
    debugGeneration('Starter configured');

    debug('Client generation successful for target: %s', targetDir);
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
    debug('ERROR: Client generation failed - %s', errorMessage);
    debug('Error details: %O', error);
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
    debug('Command handler invoked for GenerateClient');
    const result = await handleGenerateClientCommandInternal(command);
    if (result.type === 'ClientGenerated') {
      debug('Handler completed successfully');
      console.log('Client generated successfully');
    } else {
      debug('Handler failed with error: %s', result.data.error);
      console.error(`Failed: ${result.data.error}`);
    }
  },
};

// CLI arguments interface
interface CliArgs {
  _: string[];
  [key: string]: unknown;
}

// Default values for CLI arguments
const CLI_DEFAULTS = {
  starterDir: './.auto/shadcn-starter',
  targetDir: './client',
  iaSchemaPath: './.context/auto-ia-scheme.json',
  gqlSchemaPath: './.context/schema.graphql',
  figmaVariablesPath: './.context/figma-variables.json',
};

// Helper to parse message bus format
function parseMessageBusFormat(cliArgs: CliArgs): GenerateClientCommand['data'] {
  return {
    starterDir: (cliArgs.starterDir as string) ?? CLI_DEFAULTS.starterDir,
    targetDir: (cliArgs.targetDir as string) ?? CLI_DEFAULTS.targetDir,
    iaSchemaPath: (cliArgs.iaSchemaPath as string) ?? CLI_DEFAULTS.iaSchemaPath,
    gqlSchemaPath: (cliArgs.gqlSchemaPath as string) ?? CLI_DEFAULTS.gqlSchemaPath,
    figmaVariablesPath: (cliArgs.figmaVariablesPath as string) ?? CLI_DEFAULTS.figmaVariablesPath,
  };
}

// Helper to parse traditional CLI format
function parseTraditionalFormat(args: string[]): GenerateClientCommand['data'] {
  return {
    starterDir: args[0] ?? CLI_DEFAULTS.starterDir,
    targetDir: args[1] ?? CLI_DEFAULTS.targetDir,
    iaSchemaPath: args[2] ?? CLI_DEFAULTS.iaSchemaPath,
    gqlSchemaPath: args[3] ?? CLI_DEFAULTS.gqlSchemaPath,
    figmaVariablesPath: args[4] ?? CLI_DEFAULTS.figmaVariablesPath,
  };
}

// Helper function to parse CLI arguments
function parseCliArgs(cliArgs: CliArgs): GenerateClientCommand {
  // Check if this is from message bus (has the properties directly)
  const isMessageBusFormat = 'starterDir' in cliArgs && 'targetDir' in cliArgs;

  const data = isMessageBusFormat ? parseMessageBusFormat(cliArgs) : parseTraditionalFormat(cliArgs._ ?? []);

  return {
    type: 'GenerateClient',
    data,
    timestamp: new Date(),
  };
}

// Type guard to check if it's a GenerateClientCommand
function isGenerateClientCommand(obj: unknown): obj is GenerateClientCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    ((obj as { type: unknown }).type === 'GenerateClient' || (obj as { type: unknown }).type === 'generate:client')
  );
}

// Default export for CLI usage
export default async (commandOrArgs: GenerateClientCommand | CliArgs) => {
  debug('Default export called with:', commandOrArgs);

  let command: GenerateClientCommand;

  if (isGenerateClientCommand(commandOrArgs)) {
    // Normalize the type if it comes from message bus
    command = {
      ...commandOrArgs,
      type: 'GenerateClient' as const,
    };
  } else {
    command = parseCliArgs(commandOrArgs);
  }

  debug('Parsed command:', command);

  const result = await handleGenerateClientCommandInternal(command);
  if (result.type === 'ClientGenerated') {
    console.log('Client generated successfully');
  } else {
    console.error(`Failed: ${result.data.error}`);
  }
};
