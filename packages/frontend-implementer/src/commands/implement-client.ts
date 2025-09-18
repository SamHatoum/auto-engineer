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
    failures?: string[];
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

export type ImplementClientEvents = ClientImplementedEvent | ClientImplementationFailedEvent;

export const commandHandler = defineCommandHandler<ImplementClientCommand>({
  name: 'ImplementClient',
  alias: 'implement:client',
  description: 'AI implements client',
  category: 'implement',
  icon: 'code',
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
    failures: {
      description: 'Any failures from previous implementations',
      required: false,
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
  const { projectDir, iaSchemeDir, designSystemPath, failures = [] } = command.data;

  try {
    await runAIAgent(projectDir, iaSchemeDir, designSystemPath, failures);

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
