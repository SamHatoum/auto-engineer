import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { getFs } from './filestore.node';

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

  const fs = await getFs();

  await fs.ensureDir(targetDir);

  const entries = await fs.readdir(sourceDir);

  for (const entry of entries) {
    const sourcePath = fs.join(sourceDir, entry.name);
    let targetName = entry.name;

    // Remove .txt extension if present and requested
    if (removeTxtExtension && entry.type === 'file' && targetName.endsWith('.txt')) {
      targetName = targetName.slice(0, -4);
    }

    const targetPath = fs.join(targetDir, targetName);

    if (entry.type === 'dir') {
      const subFiles = await copyDirectoryRecursive(sourcePath, targetPath, removeTxtExtension);
      createdFiles.push(...subFiles);
    } else {
      const content = await fs.readText(sourcePath);
      await fs.writeText(targetPath, content ?? '');
      createdFiles.push(targetName);
    }
  }

  return createdFiles;
}

async function handleCreateExampleCommandInternal(
  command: CreateExampleCommand,
): Promise<ExampleCreatedEvent | ExampleCreationFailedEvent> {
  const { exampleName, targetDirectory } = command.data;

  const fs = await getFs();
  const fileName = new URL(import.meta.url).href;
  const dirName = fs.dirname(fileName);

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

    const templatesDir = fs.join(dirName, '..', 'templates');
    const sourceDir = fs.join(templatesDir, exampleFolder);

    // Check if source directory exists
    if (!(await fs.exists(sourceDir))) {
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
    const result = await handleCreateExampleCommandInternal(command);
    console.log(result.type === 'ExampleCreated' ? 'Example created successfully' : `Failed: ${result.data.error}`);
  },
};

// CLI arguments interface
interface CliArgs {
  name?: string;
  destination?: string;
  exampleName?: string;
  targetDirectory?: string;
  arg2?: string;
  timestamp?: Date;
  requestId?: string;
  [key: string]: unknown;
}

// Type guard to check if it's a CreateExampleCommand
function isCreateExampleCommand(obj: unknown): obj is CreateExampleCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    (obj as { type: unknown }).type === 'CreateExample'
  );
}

function createCommandFromMessageBus(commandOrArgs: CreateExampleCommand): CreateExampleCommand {
  const data = commandOrArgs.data as CreateExampleCommand['data'] & CliArgs;
  return {
    type: 'CreateExample',
    data: {
      exampleName: data.name ?? data.exampleName ?? 'shopping-assistant',
      targetDirectory: data.targetDirectory ?? data.destination ?? data.arg2 ?? process.cwd(),
    },
    timestamp: commandOrArgs.timestamp ?? new Date(),
    requestId: commandOrArgs.requestId ?? `cli-${Date.now()}`,
  };
}

function createCommandFromCliArgs(args: CliArgs): CreateExampleCommand {
  return {
    type: 'CreateExample',
    data: {
      exampleName: args.name ?? args.exampleName ?? 'shopping-assistant',
      targetDirectory: args.destination ?? args.targetDirectory ?? process.cwd(),
    },
    timestamp: args.timestamp ?? new Date(),
    requestId: args.requestId ?? `cli-${Date.now()}`,
  };
}

// Export for CLI usage - this matches what plugin-loader expects
const handler = async (commandOrArgs: CreateExampleCommand | CliArgs) => {
  // Write to a debug file since console output seems to be suppressed
  const debugInfo = `Handler received: ${JSON.stringify(commandOrArgs, null, 2)}\n`;
  await fs.writeFile('/tmp/create-example-debug.txt', debugInfo);

  // Handle both Command object from message bus and plain args
  const command = isCreateExampleCommand(commandOrArgs)
    ? createCommandFromMessageBus(commandOrArgs)
    : createCommandFromCliArgs(commandOrArgs);

  await fs.appendFile('/tmp/create-example-debug.txt', `Command created: ${JSON.stringify(command, null, 2)}\n`);

  console.log('Creating example with command:', JSON.stringify(command, null, 2));

  try {
    const result = await handleCreateExampleCommandInternal(command);

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.type === 'ExampleCreated') {
      const createdData = result.data as { exampleName: string; targetDirectory: string; filesCreated: string[] };
      console.log(`✅ Example "${createdData.exampleName}" created successfully!`);
      console.log(`📁 Created ${createdData.filesCreated.length} files in ${createdData.targetDirectory}`);

      // List some of the created files
      if (createdData.filesCreated.length > 0) {
        console.log('Files created:');
        createdData.filesCreated.slice(0, 10).forEach((file: string) => console.log(`  - ${file}`));
        if (createdData.filesCreated.length > 10) {
          console.log(`  ... and ${createdData.filesCreated.length - 10} more files`);
        }
      }
    } else {
      const errorData = result.data as { exampleName: string; targetDirectory: string; error: string };
      console.error(`❌ Failed to create example: ${errorData.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in create-example handler:', error);
    throw error;
  }
};

export default handler;
