import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { getFs } from './filestore.node';
import { execSync } from 'child_process';

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

// Detect which package manager is available
async function getPackageManager(): Promise<'pnpm' | 'npm'> {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return 'pnpm';
  } catch {
    // npm is always available with Node.js
    return 'npm';
  }
}

// Install dependencies in the target directory
async function installDependencies(targetDirectory: string): Promise<{ success: boolean; packageManager: string }> {
  const packageManager = await getPackageManager();

  try {
    console.log(`✓ Installing dependencies...`);

    // Change to the target directory and run install
    const command = packageManager === 'pnpm' ? 'pnpm install --silent' : 'npm install --silent';
    execSync(command, {
      cwd: targetDirectory,
      stdio: 'pipe', // Suppress output
    });

    console.log(`✓ Dependencies installed`);
    return { success: true, packageManager };
  } catch (error) {
    console.error(`✗ Failed to install dependencies`, error);
    return { success: false, packageManager };
  }
}

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

    // Create the target directory if it doesn't exist
    await fs.ensureDir(targetDirectory);

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
    ((obj as { type: unknown }).type === 'CreateExample' || (obj as { type: unknown }).type === 'create:example')
  );
}

function createCommandFromMessageBus(commandOrArgs: CreateExampleCommand): CreateExampleCommand {
  const data = commandOrArgs.data as CreateExampleCommand['data'] & CliArgs;
  const exampleName = data.name ?? data.exampleName ?? 'shopping-assistant';
  // Use the destination if provided, otherwise use the example name as directory
  const targetDirectory = data.targetDirectory ?? data.destination ?? data.arg2 ?? exampleName;
  return {
    type: 'CreateExample',
    data: {
      exampleName,
      targetDirectory,
    },
    timestamp: commandOrArgs.timestamp ?? new Date(),
    requestId: commandOrArgs.requestId ?? `cli-${Date.now()}`,
  };
}

function createCommandFromCliArgs(args: CliArgs): CreateExampleCommand {
  const exampleName = args.name ?? args.exampleName ?? 'shopping-assistant';
  // Use the destination if provided, otherwise use the example name as directory
  const targetDirectory = args.destination ?? args.targetDirectory ?? exampleName;
  return {
    type: 'CreateExample',
    data: {
      exampleName,
      targetDirectory,
    },
    timestamp: args.timestamp ?? new Date(),
    requestId: args.requestId ?? `cli-${Date.now()}`,
  };
}

// Export for CLI usage - this matches what plugin-loader expects
const handler = async (commandOrArgs: CreateExampleCommand | CliArgs) => {
  // Handle both Command object from message bus and plain args
  const command = isCreateExampleCommand(commandOrArgs)
    ? createCommandFromMessageBus(commandOrArgs)
    : createCommandFromCliArgs(commandOrArgs);

  try {
    const result = await handleCreateExampleCommandInternal(command);

    if (result.type === 'ExampleCreated') {
      const createdData = result.data as { exampleName: string; targetDirectory: string; filesCreated: string[] };
      console.log(`✓ Created "${createdData.exampleName}" example in ./${createdData.targetDirectory}/`);

      // Install dependencies
      const { success, packageManager } = await installDependencies(createdData.targetDirectory);

      // Print next steps instructions
      console.log('\nGet started:');
      console.log(`   cd ${createdData.targetDirectory}`);

      if (!success) {
        console.log(`   ${packageManager} install`);
      }

      console.log(`   ${packageManager} dev\n`);
    } else {
      const errorData = result.data as { exampleName: string; targetDirectory: string; error: string };
      console.error(`✗ Failed to create example: ${errorData.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in create-example handler:', error);
    throw error;
  }
};

export default handler;
