import {
  CommandSender,
  isErrorConstructor,
  type ErrorConstructor,
  AssertionError,
  assertTrue,
  type MessageProcessor,
} from '@event-driven-io/emmett';

interface CommandCheck<CommandType> {
  (command: CommandType): boolean;
}

interface ErrorCheck<ErrorType> {
  (error: ErrorType): boolean;
}

export type ThenThrows<ErrorType extends Error> =
  | (() => void)
  | ((errorConstructor: ErrorConstructor<ErrorType>) => void)
  | ((errorCheck: ErrorCheck<ErrorType>) => void)
  | ((errorConstructor: ErrorConstructor<ErrorType>, errorCheck?: ErrorCheck<ErrorType>) => void);

interface ReactorSpecificationReturn<Event, Command, Context> {
  when: (
    event: Event | Event[],
    context?: Context,
  ) => {
    then: (expectedCommand: Command | Command[] | CommandCheck<Command> | CommandCheck<Command[]>) => Promise<void>;
    thenNothingHappened: () => Promise<void>;
    thenThrows: <ErrorType extends Error = Error>(...args: Parameters<ThenThrows<ErrorType>>) => Promise<void>;
  };
}

export interface ReactorSpecification<
  Event,
  Command,
  Context extends { commandSender: CommandSender } = { commandSender: CommandSender },
> {
  (givenEvents: Event | Event[]): ReactorSpecificationReturn<Event, Command, Context>;
}

export const ReactorSpecification = {
  for: reactorSpecificationFor,
};

interface MockCommandSender<Command> extends CommandSender {
  sentCommands: Command[];
  reset: () => void;
}

function createMockCommandSender<Command>(): MockCommandSender<Command> {
  const sentCommands: Command[] = [];

  const send = async <CommandType extends Command = Command>(command: CommandType): Promise<void> => {
    sentCommands.push(command);
  };

  return {
    send,
    sentCommands,
    reset: () => {
      sentCommands.length = 0;
    },
  } as MockCommandSender<Command>;
}

type ReactorLike<Event, Context> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { handle: (events: Event[], context: Context) => Promise<any> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { eachMessage: (event: Event, context: Context) => Promise<any> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | MessageProcessor<any, any, any>;

function reactorSpecificationFor<Event, Command, Context extends { commandSender: CommandSender }>(
  processorOrReactor: ReactorLike<Event, Context> | (() => ReactorLike<Event, Context>),
  createContext: (commandSender: CommandSender) => Context,
): ReactorSpecification<Event, Command, Context> {
  return (givenEvents: Event | Event[]) => {
    return {
      when: (whenEvent: Event | Event[], contextOverride?: Context) => {
        const mockCommandSender = createMockCommandSender<Command>();
        const defaultContext = createContext(mockCommandSender);
        const context = contextOverride || defaultContext;

        const handle = async () => {
          const givenArray = Array.isArray(givenEvents) ? givenEvents : givenEvents != null ? [givenEvents] : [];
          const whenArray = Array.isArray(whenEvent) ? whenEvent : [whenEvent];
          const allEvents = [...givenArray, ...whenArray];

          // Transform events to have metadata
          const eventsWithMetadata = allEvents.map((event, index) => ({
            ...event,
            kind: 'Event' as const,
            metadata: {
              streamName: 'test-stream',
              messageId: `test-${index}`,
              streamPosition: BigInt(index + 1),
              globalPosition: BigInt(index + 1),
            },
          }));

          const contextWithMock = { ...context, commandSender: mockCommandSender };

          // Get the actual reactor instance
          const reactor = typeof processorOrReactor === 'function' ? processorOrReactor() : processorOrReactor;

          // Handle different reactor types
          if ('handle' in reactor && typeof reactor.handle === 'function') {
            // It's a MessageProcessor or has a handle method
            await reactor.handle(eventsWithMetadata, contextWithMock);
          } else if ('eachMessage' in reactor && typeof reactor.eachMessage === 'function') {
            // It has eachMessage
            for (const event of eventsWithMetadata) {
              await reactor.eachMessage(event, contextWithMock);
            }
          } else {
            throw new Error('Reactor must have either a handle or eachMessage method');
          }

          return mockCommandSender.sentCommands;
        };

        return {
          then: async (
            expectedCommand: Command | Command[] | CommandCheck<Command> | CommandCheck<Command[]>,
          ): Promise<void> => {
            try {
              const sentCommands = await handle();

              if (typeof expectedCommand === 'function') {
                const checkFn = expectedCommand;
                if (sentCommands.length === 1) {
                  assertTrue(
                    (checkFn as CommandCheck<Command>)(sentCommands[0]),
                    `Sent command did not match the expected condition: ${JSON.stringify(sentCommands[0])}`,
                  );
                } else {
                  assertTrue(
                    (checkFn as CommandCheck<Command[]>)(sentCommands),
                    `Sent commands did not match the expected condition: ${JSON.stringify(sentCommands)}`,
                  );
                }
                return;
              }

              if (Array.isArray(expectedCommand)) {
                assertTrue(
                  sentCommands.length === expectedCommand.length,
                  `Expected ${expectedCommand.length} command(s) to be sent, but ${sentCommands.length} were sent`,
                );

                expectedCommand.forEach((expected, index) => {
                  const sent = sentCommands[index];
                  assertCommandsMatch(sent, expected, index);
                });
                return;
              }

              if (sentCommands.length === 0) {
                throw new AssertionError('No commands were sent');
              }

              if (sentCommands.length > 1) {
                throw new AssertionError(`Expected 1 command to be sent, but ${sentCommands.length} were sent`);
              }

              assertCommandsMatch(sentCommands[0], expectedCommand);
            } finally {
              mockCommandSender.reset();
            }
          },

          thenNothingHappened: async (): Promise<void> => {
            try {
              const sentCommands = await handle();
              if (sentCommands.length > 0) {
                throw new AssertionError(
                  `Expected no commands to be sent, but ${sentCommands.length} command(s) were sent: ${JSON.stringify(sentCommands)}`,
                );
              }
            } finally {
              mockCommandSender.reset();
            }
          },

          thenThrows: async <ErrorType extends Error>(...args: Parameters<ThenThrows<ErrorType>>): Promise<void> => {
            try {
              await handle();
              throw new AssertionError('Reactor did not fail as expected');
            } catch (error) {
              thenThrowsErrorHandler(error, args);
            } finally {
              mockCommandSender.reset();
            }
          },
        };
      },
    };
  };
}

interface CommandWithMetadata {
  metadata?: Record<string, unknown>;
}

// eslint-disable-next-line complexity
function assertCommandsMatch<Command>(actual: Command, expected: Command, index?: number): void {
  const actualCopy = { ...actual } as CommandWithMetadata & Record<string, unknown>;
  const expectedCopy = { ...expected } as CommandWithMetadata & Record<string, unknown>;

  if (actualCopy.metadata !== undefined && expectedCopy.metadata !== undefined) {
    for (const key in expectedCopy.metadata) {
      const expectedValue = expectedCopy.metadata[key];
      const actualValue = actualCopy.metadata[key];

      const expectedStr =
        expectedValue === undefined ? 'undefined' : expectedValue === null ? 'null' : String(expectedValue);
      const actualStr = actualValue === undefined ? 'undefined' : actualValue === null ? 'null' : String(actualValue);

      assertTrue(
        actualValue === expectedValue,
        `Command${index !== undefined ? ` at index ${index}` : ''} metadata.${key} does not match.\nExpected: ${expectedStr}\nActual: ${actualStr}`,
      );
    }
    delete actualCopy.metadata;
    delete expectedCopy.metadata;
  } else if (actualCopy.metadata !== undefined && expectedCopy.metadata === undefined) {
    delete actualCopy.metadata;
  }

  assertTrue(
    JSON.stringify(actualCopy) === JSON.stringify(expectedCopy),
    `Command${index !== undefined ? ` at index ${index}` : ''} does not match.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
  );
}

function thenThrowsErrorHandler<ErrorType extends Error>(
  error: unknown,
  args: Parameters<ThenThrows<ErrorType>>,
): void {
  if (error instanceof AssertionError) throw error;

  if (args.length === 0) return;

  if (!isErrorConstructor(args[0])) {
    assertTrue(args[0](error as ErrorType), `Error didn't match the error condition: ${error?.toString()}`);
    return;
  }

  assertTrue(error instanceof args[0], `Caught error is not an instance of the expected type: ${error?.toString()}`);

  if (args[1]) {
    assertTrue(args[1](error as ErrorType), `Error didn't match the error condition: ${error?.toString()}`);
  }
}
