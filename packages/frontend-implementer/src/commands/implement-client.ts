import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { runAIAgent } from '../agent';
import createDebug from 'debug';

const debug = createDebug('frontend-implementer:implement-client');

export const implementClientManifest = {
  handler: () => Promise.resolve({ default: implementClientCommandHandler }),
  description: 'AI implements client',
  usage: 'implement:client <client> <context> <principles> <design>',
  examples: ['$ auto implement:client ./client ./.context ./design-principles.md ./design-system.md'],
  args: [
    { name: 'client', description: 'Client directory path', required: true },
    { name: 'context', description: 'Context directory path', required: true },
    { name: 'principles', description: 'Design principles file', required: true },
    { name: 'design', description: 'Design system file', required: true },
  ],
};

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

    debug('AI project implementation complete!');

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
    debug('Failed to implement client: %O', error);

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

export const implementClientCommandHandler: CommandHandler<
  ImplementClientCommand,
  ClientImplementedEvent | ClientImplementationFailedEvent
> = {
  name: 'ImplementClient',
  handle: async (
    command: ImplementClientCommand,
  ): Promise<ClientImplementedEvent | ClientImplementationFailedEvent> => {
    const result = await handleImplementClientCommandInternal(command);
    if (result.type === 'ClientImplemented') {
      debug('Client implemented successfully');
    } else {
      debug('Failed: %s', result.data.error);
    }
    return result;
  },
};

// Default export is the command handler
export default implementClientCommandHandler;
