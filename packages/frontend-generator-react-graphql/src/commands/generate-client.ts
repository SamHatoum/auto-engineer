import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import { FrontendScaffoldBuilder } from '../builder';
import { generateComponents } from '../generator/generateComponents';
import { writeGqlOperationsToFolder } from '../scaffold-gql-operations';
import { generateSchemaFile } from '../write-graphql-schema';
import { runCodegen } from '../run-codegen';
import { ComponentType, IAScheme } from '../types';
import { configureStarter } from '../configure-starter';
import createDebug from 'debug';

const debug = createDebug('auto:frontend-generator-react-graphql:command');
const debugBuilder = createDebug('auto:frontend-generator-react-graphql:command:builder');
const debugGeneration = createDebug('auto:frontend-generator-react-graphql:command:generation');

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

export type MoleculeGeneratedEvent = Event<
  'MoleculeGenerated',
  {
    filePath: string;
  }
>;

export type OrganismGeneratedEvent = Event<
  'OrganismGenerated',
  {
    filePath: string;
  }
>;

export type PageGeneratedEvent = Event<
  'PageGenerated',
  {
    filePath: string;
  }
>;

export type AppGeneratedEvent = Event<
  'AppGenerated',
  {
    filePath: string;
  }
>;

type ComponentGeneratedEvent = MoleculeGeneratedEvent | OrganismGeneratedEvent | PageGeneratedEvent | AppGeneratedEvent;

export type ClientGenerationFailedEvent = Event<
  'ClientGenerationFailed',
  {
    error: string;
    targetDir: string;
  }
>;

export type GenerateClientEvents = ClientGeneratedEvent | ClientGenerationFailedEvent | ComponentGeneratedEvent;

export const commandHandler = defineCommandHandler({
  name: 'GenerateClient',
  alias: 'generate:client',
  description: 'Generate React client app',
  category: 'generate',
  icon: 'monitor',
  fields: {
    starterDir: {
      description: 'Starter template path',
      required: true,
    },
    targetDir: {
      description: 'Client output directory',
      required: true,
    },
    iaSchemaPath: {
      description: 'Information architecture JSON file',
      required: true,
    },
    gqlSchemaPath: {
      description: 'GraphQL schema file',
      required: true,
    },
    figmaVariablesPath: {
      description: 'Figma variables JSON file',
      required: true,
    },
  },
  examples: [
    '$ auto generate:client --starter-dir=./shadcn-starter --target-dir=./client --ia-schema-path=./auto-ia.json --gql-schema-path=./schema.graphql --figma-variables-path=./figma-vars.json',
  ],
  events: ['ClientGenerated', 'ClientGenerationFailed'],
  handle: async (command: Command): Promise<GenerateClientEvents | GenerateClientEvents[]> => {
    const typedCommand = command as GenerateClientCommand;
    debug('Command handler invoked for GenerateClient');
    const result = await handleGenerateClientCommandInternal(typedCommand);
    const events = Array.isArray(result) ? result : [result];
    const finalEvent = events[events.length - 1];
    if (finalEvent.type === 'ClientGenerated') {
      debug('Client generated at %s', finalEvent.data.targetDir);
    } else if (finalEvent.type === 'ClientGenerationFailed') {
      debug('Failed to generate client: %s', finalEvent.data.error);
    }
    return result;
  },
});

async function handleGenerateClientCommandInternal(command: GenerateClientCommand): Promise<GenerateClientEvents[]> {
  const { starterDir, targetDir, iaSchemaPath, gqlSchemaPath, figmaVariablesPath } = command.data;
  const events: GenerateClientEvents[] = [];

  debug('Starting client generation');
  debug('Starter directory: %s', starterDir);
  debug('Target directory: %s', targetDir);

  try {
    debugBuilder('Creating FrontendScaffoldBuilder');
    const builder = new FrontendScaffoldBuilder();

    debugBuilder('Cloning starter from: %s', starterDir);
    await builder.cloneStarter(starterDir);

    debugBuilder('Building to target: %s', targetDir);
    await builder.build(targetDir);
    debugBuilder('Build complete');

    debugGeneration('Reading IA schema from: %s', iaSchemaPath);
    const iaSchemeJsonFile = await fs.readFile(iaSchemaPath, 'utf-8');
    debugGeneration('IA schema file size: %d bytes', iaSchemeJsonFile.length);
    const iaSchemeJson = JSON.parse(iaSchemeJsonFile) as IAScheme;
    debugGeneration('IA schema parsed successfully');

    debugGeneration('Generating components to: %s/src', targetDir);
    const generatedComponents = generateComponents(iaSchemeJson, `${targetDir}/src`) ?? [];
    debugGeneration(generatedComponents.length, 'components generated');

    const componentTypeToEventType: Record<ComponentType, ComponentGeneratedEvent['type']> = {
      molecule: 'MoleculeGenerated',
      organism: 'OrganismGenerated',
      page: 'PageGenerated',
      app: 'AppGenerated',
    };

    generatedComponents.forEach((component) => {
      const eventType = componentTypeToEventType[component.type];
      if (eventType) {
        debugGeneration('Emitting event for generated %s: %s', component.type, component.path);
        events.push({
          type: eventType,
          data: {
            filePath: component.path,
          },
          timestamp: new Date(),
          requestId: command.requestId,
          correlationId: command.correlationId,
        });
      }
    });

    debugGeneration('Writing GraphQL operations to: %s/src', targetDir);
    writeGqlOperationsToFolder(iaSchemeJson, `${targetDir}/src`);
    debugGeneration('GraphQL operations written');

    debugGeneration('Generating GraphQL schema from: %s', gqlSchemaPath);
    generateSchemaFile(gqlSchemaPath, targetDir);
    debugGeneration('GraphQL schema generated');

    debugGeneration('Running codegen in: %s', targetDir);
    runCodegen(targetDir);
    debugGeneration('Codegen complete');

    debugGeneration('Configuring starter with Figma variables: %s', figmaVariablesPath);
    configureStarter(figmaVariablesPath, targetDir);
    debugGeneration('Starter configured');

    debug('Client generation completed successfully');
    debug('Target directory: %s', targetDir);

    events.push({
      type: 'ClientGenerated',
      data: {
        targetDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    });
    return events;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug('Client generation failed with error: %O', error);

    events.push({
      type: 'ClientGenerationFailed',
      data: {
        error: errorMessage,
        targetDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    });
    return events;
  }
}

// Default export is the command handler
export default commandHandler;
