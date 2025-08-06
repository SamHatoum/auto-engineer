#!/usr/bin/env node
import { type CommandHandler } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type CreateExampleCommand = {
  readonly type: 'CreateExample';
  readonly data: {
    exampleName: string;
    targetDirectory: string;
  };
  readonly timestamp?: Date;
  readonly requestId?: string;
  readonly correlationId?: string;
};

export type ExampleCreatedEvent = {
  readonly type: 'ExampleCreated';
  readonly data: {
    exampleName: string;
    targetDirectory: string;
    filesCreated: string[];
  };
  readonly timestamp?: Date;
  readonly requestId?: string;
  readonly correlationId?: string;
};

export type ExampleCreationFailedEvent = {
  readonly type: 'ExampleCreationFailed';
  readonly data: {
    exampleName: string;
    targetDirectory: string;
    error: string;
  };
  readonly timestamp?: Date;
  readonly requestId?: string;
  readonly correlationId?: string;
};

const EXAMPLE_FILES: Record<string, { source: string; target: string }[]> = {
  'shopping-assistant': [
    {
      source: 'shipping-assistant.ts.txt',
      target: 'shopping-assistant.flow.ts',
    },
    {
      source: 'auto.config.ts.txt',
      target: 'auto.config.ts',
    },
  ],
};

export async function handleCreateExampleCommand(
  command: CreateExampleCommand,
): Promise<ExampleCreatedEvent | ExampleCreationFailedEvent> {
  const { exampleName, targetDirectory } = command.data;

  try {
    const exampleFiles = EXAMPLE_FILES[exampleName];
    if (exampleFiles === undefined) {
      return {
        type: 'ExampleCreationFailed',
        data: {
          exampleName,
          targetDirectory,
          error: `Unknown example: ${exampleName}. Available examples: ${Object.keys(EXAMPLE_FILES).join(', ')}`,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    const templatesDir = path.resolve(__dirname, '..', '..', 'templates');
    const createdFiles: string[] = [];

    await fs.mkdir(targetDirectory, { recursive: true });

    for (const file of exampleFiles) {
      const sourcePath = path.join(templatesDir, file.source);
      const targetPath = path.join(targetDirectory, file.target);

      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(targetPath, content);
      createdFiles.push(file.target);
    }

    return {
      type: 'ExampleCreated',
      data: {
        exampleName,
        targetDirectory,
        filesCreated: createdFiles,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    return {
      type: 'ExampleCreationFailed',
      data: {
        exampleName,
        targetDirectory,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const createExampleCommandHandler: CommandHandler<CreateExampleCommand> = {
  name: 'CreateExample',
  handle: async (command: CreateExampleCommand): Promise<void> => {
    const result = await handleCreateExampleCommand(command);
    console.log(result.type === 'ExampleCreated' ? 'Example created successfully' : `Failed: ${result.data.error}`);
  },
};
