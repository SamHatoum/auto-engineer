import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { runAIAgent } from '../agent';

export type ImplementClientCommand = Command<
  'ImplementClient',
  {
    projectDir: string;
    iaSchemeDir: string;
    designSystemPath: string;
  }
>;

export type ClientImplementedEvent = Event<
  'ClientImplemented',
  {
    projectDir: string;
  }
>;

export type ClientImplementationFailedEvent = Event<
  'ClientImplementationFailed',
  {
    error: string;
    projectDir: string;
  }
>;

async function handleImplementClientCommandInternal(
  command: ImplementClientCommand,
): Promise<ClientImplementedEvent | ClientImplementationFailedEvent> {
  const { projectDir, iaSchemeDir, designSystemPath } = command.data;

  try {
    // Run the AI agent with absolute paths
    await runAIAgent(projectDir, iaSchemeDir, designSystemPath);

    console.log('AI project implementation complete!');

    return {
      type: 'ClientImplemented',
      data: {
        projectDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to implement client:', error);

    return {
      type: 'ClientImplementationFailed',
      data: {
        error: errorMessage,
        projectDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const implementClientCommandHandler: CommandHandler<ImplementClientCommand> = {
  name: 'ImplementClient',
  handle: async (command: ImplementClientCommand): Promise<void> => {
    const result = await handleImplementClientCommandInternal(command);
    if (result.type === 'ClientImplemented') {
      console.log('Client implemented successfully');
    } else {
      console.error(`Failed: ${result.data.error}`);
    }
  },
};

// CLI arguments interface
interface CliArgs {
  _: string[];
  [key: string]: unknown;
}

// Type guard to check if it's an ImplementClientCommand
function isImplementClientCommand(obj: unknown): obj is ImplementClientCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    (obj as { type: unknown }).type === 'ImplementClient'
  );
}

// Default export for CLI usage
export default async (commandOrArgs: ImplementClientCommand | CliArgs) => {
  const command = isImplementClientCommand(commandOrArgs)
    ? commandOrArgs
    : {
        type: 'ImplementClient' as const,
        data: {
          projectDir: commandOrArgs._?.[0] ?? './client',
          iaSchemeDir: commandOrArgs._?.[1] ?? './.context',
          // Design system path might be the 3rd or 4th argument (handling both cases)
          designSystemPath: commandOrArgs._?.[2] ?? './client/design-system-principles.md',
        },
        timestamp: new Date(),
      };

  const result = await handleImplementClientCommandInternal(command);
  if (result.type === 'ClientImplemented') {
    console.log('Client implemented successfully');
  } else {
    console.error(`Failed: ${result.data.error}`);
  }
};
