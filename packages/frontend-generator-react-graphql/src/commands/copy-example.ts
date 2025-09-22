import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import createDebug from 'debug';

const debug = createDebug('frontend-generator-react-graphql:copy-example');

export type CopyExampleCommand = Command<
  'CopyExample',
  {
    starterName: string;
    targetDir: string;
  }
>;

export type ExampleCopiedEvent = Event<
  'ExampleCopied',
  {
    starterName: string;
    targetDir: string;
  }
>;

export type ExampleCopyFailedEvent = Event<
  'ExampleCopyFailed',
  {
    error: string;
    starterName: string;
    targetDir: string;
  }
>;

export const commandHandler = defineCommandHandler<
  CopyExampleCommand,
  (command: CopyExampleCommand) => Promise<ExampleCopiedEvent | ExampleCopyFailedEvent>
>({
  name: 'CopyExample',
  alias: 'copy:example',
  description: 'Copy example React GraphQL template',
  category: 'copy',
  icon: 'copy',
  fields: {
    starterName: {
      description: 'Name of the example template',
      required: true,
    },
    targetDir: {
      description: 'Destination directory',
      required: true,
    },
  },
  examples: ['$ auto copy:example --starter-name=shadcn-starter --target-dir=./my-starter'],
  events: ['ExampleCopied', 'ExampleCopyFailed'],
  handle: async (command: Command): Promise<ExampleCopiedEvent | ExampleCopyFailedEvent> => {
    const typedCommand = command as CopyExampleCommand;
    const result = await handleCopyExampleCommand(typedCommand);
    if (result.type === 'ExampleCopied') {
      debug('Starter "%s" copied successfully to %s', result.data.starterName, result.data.targetDir);
    } else {
      debug('Failed to copy starter: %s', result.data.error);
    }
    return result;
  },
});

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function handleCopyExampleCommand(
  command: CopyExampleCommand,
): Promise<ExampleCopiedEvent | ExampleCopyFailedEvent> {
  const { starterName, targetDir } = command.data;

  try {
    // Get the package directory where this command is located
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageDir = path.dirname(path.dirname(__dirname));

    // Define available starters
    const availableStarters = ['shadcn-starter', 'mui-starter'];

    if (!availableStarters.includes(starterName)) {
      return {
        type: 'ExampleCopyFailed',
        data: {
          error: `Invalid starter name. Available starters: ${availableStarters.join(', ')}`,
          starterName,
          targetDir,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    const starterPath = path.join(packageDir, starterName);
    const autoDir = path.join(targetDir, '.auto');
    const finalTargetDir = path.join(autoDir, starterName);

    // Check if starter exists
    try {
      await fs.access(starterPath);
    } catch {
      return {
        type: 'ExampleCopyFailed',
        data: {
          error: `Starter "${starterName}" not found at ${starterPath}`,
          starterName,
          targetDir,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    // Create .auto directory if it doesn't exist
    await fs.mkdir(autoDir, { recursive: true });

    // Copy the starter
    await copyDirectory(starterPath, finalTargetDir);

    return {
      type: 'ExampleCopied',
      data: {
        starterName,
        targetDir: finalTargetDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug('Failed to copy example: %O', error);

    return {
      type: 'ExampleCopyFailed',
      data: {
        error: errorMessage,
        starterName,
        targetDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

// Default export is the command handler
export default commandHandler;
