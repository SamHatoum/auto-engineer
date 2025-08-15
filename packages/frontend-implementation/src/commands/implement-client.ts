import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { runAIAgent } from '../agent';

export type ImplementClientCommand = Command<
  'ImplementClient',
  {
    projectDir: string;
    iaSchemeDir: string;
    userPreferencesPath: string;
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

export async function handleImplementClientCommand(
  command: ImplementClientCommand,
): Promise<ClientImplementedEvent | ClientImplementationFailedEvent> {
  const { projectDir, iaSchemeDir, userPreferencesPath, designSystemPath } = command.data;

  try {
    // Run the AI agent with absolute paths
    await runAIAgent(projectDir, iaSchemeDir, userPreferencesPath, designSystemPath);

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
    const result = await handleImplementClientCommand(command);
    if (result.type === 'ClientImplemented') {
      console.log('Client implemented successfully');
    } else {
      console.error(`Failed: ${result.data.error}`);
    }
  },
};
