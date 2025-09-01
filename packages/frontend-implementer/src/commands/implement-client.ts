import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import { runAIAgent } from '../agent';
import createDebug from 'debug';

const debug = createDebug('frontend-implementer:implement-client');

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

export const commandHandler = defineCommandHandler<ImplementClientCommand>({
  name: 'ImplementClient',
  alias: 'implement:client',
  description: 'AI implements client',
  category: 'implement',
  fields: {
    projectDir: {
      description: 'Client directory path',
      required: true,
    },
    iaSchemeDir: {
      description: 'Context directory path',
      required: true,
    },
    designSystemPath: {
      description: 'Design system file',
      required: true,
    },
  },
  examples: [
    '$ auto implement:client --project-dir=./client --ia-scheme-dir=./.context --design-system-path=./design-system.md',
  ],
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
});

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

// Default export is the command handler
export default commandHandler;
