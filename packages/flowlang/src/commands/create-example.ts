import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type CreateExampleCommand = Command<
  'CreateExample',
  {
    exampleName: string;
    targetDirectory: string;
  }
>;

export type ExampleCreatedEvent = Event<
  'ExampleCreated',
  {
    exampleName: string;
    targetDirectory: string;
    filesCreated: string[];
  }
>;

export type ExampleCreationFailedEvent = Event<
  'ExampleCreationFailed',
  {
    exampleName: string;
    targetDirectory: string;
    error: string;
  }
>;

const EXAMPLE_FOLDERS: Record<string, string> = {
  'shopping-assistant': 'shopping-assitant', // Note: keeping the typo to match actual folder name
};

async function copyDirectoryRecursive(
  sourceDir: string,
  targetDir: string,
  removeTxtExtension: boolean = true,
): Promise<string[]> {
  const createdFiles: string[] = [];

  await fs.mkdir(targetDir, { recursive: true });

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    let targetName = entry.name;

    // Remove .txt extension if present and requested
    if (removeTxtExtension && entry.isFile() && targetName.endsWith('.txt')) {
      targetName = targetName.slice(0, -4);
    }

    const targetPath = path.join(targetDir, targetName);

    if (entry.isDirectory()) {
      const subFiles = await copyDirectoryRecursive(sourcePath, targetPath, removeTxtExtension);
      createdFiles.push(...subFiles);
    } else {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(targetPath, content);
      createdFiles.push(path.relative(targetDir, targetPath));
    }
  }

  return createdFiles;
}

export async function handleCreateExampleCommand(
  command: CreateExampleCommand,
): Promise<ExampleCreatedEvent | ExampleCreationFailedEvent> {
  const { exampleName, targetDirectory } = command.data;

  try {
    const exampleFolder = EXAMPLE_FOLDERS[exampleName];
    if (exampleFolder === undefined) {
      return {
        type: 'ExampleCreationFailed',
        data: {
          exampleName,
          targetDirectory,
          error: `Unknown example: ${exampleName}. Available examples: ${Object.keys(EXAMPLE_FOLDERS).join(', ')}`,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    const templatesDir = path.resolve(__dirname, '..', 'templates');
    const sourceDir = path.join(templatesDir, exampleFolder);

    // Check if source directory exists
    try {
      await fs.access(sourceDir);
    } catch {
      return {
        type: 'ExampleCreationFailed',
        data: {
          exampleName,
          targetDirectory,
          error: `Template directory not found: ${sourceDir}`,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    const createdFiles = await copyDirectoryRecursive(sourceDir, targetDirectory, true);

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
