import {
    CommandSender,
    isErrorConstructor,
    type ErrorConstructor,
    AssertionError,
    assertTrue, MessageHandlerResult
} from '@event-driven-io/emmett';

type CommandCheck<CommandType> = (command: CommandType) => boolean;
type ErrorCheck<ErrorType> = (error: ErrorType) => boolean;

export type ThenThrows<ErrorType extends Error> =
    | (() => void)
    | ((errorConstructor: ErrorConstructor<ErrorType>) => void)
    | ((errorCheck: ErrorCheck<ErrorType>) => void)
    | ((
    errorConstructor: ErrorConstructor<ErrorType>,
    errorCheck?: ErrorCheck<ErrorType>,
) => void);

export type ReactorSpecification<Event, Command, Context extends { commandSender: CommandSender } = {
    commandSender: CommandSender
}> = (
    givenEvents: Event | Event[],
) => {
    when: (event: Event | Event[], context?: Context) => {
        then: (expectedCommand: Command | Command[] | CommandCheck<Command> | CommandCheck<Command[]>) => Promise<void>;
        thenNothingHappened: () => Promise<void>;
        thenThrows: <ErrorType extends Error = Error>(
            ...args: Parameters<ThenThrows<ErrorType>>
        ) => Promise<void>;
    };
};

export const ReactorSpecification = {
    for: reactorSpecificationFor,
};

type MockCommandSender<Command> = CommandSender & {
    sentCommands: Command[];
    reset: () => void;
};

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

function reactorSpecificationFor<Event, Command, Context extends { commandSender: CommandSender }>(
    processorOrReactor:
        | { handle: (events: any[], context: Context) => Promise<any> }
        | { handle: (messages: any[], context: Context) => MessageHandlerResult | Promise<MessageHandlerResult> },
    createContext: (commandSender: CommandSender) => Context,
    options?: {
        wrapEvents?: boolean;
        defaultMetadata?: (index: number) => any;
    }
): ReactorSpecification<Event, Command, Context> {
    const { wrapEvents = true, defaultMetadata } = options || {};
    const reactor = {
        handle: async (events: any[], context: Context) => {
            const result = processorOrReactor.handle(events, context);
            await result;
        },
    };
    return (givenEvents: Event | Event[]) => {
        return {
            when: (whenEvent: Event | Event[], contextOverride?: Context) => {
                const mockCommandSender = createMockCommandSender<Command>();
                const defaultContext = createContext(mockCommandSender);
                const context = contextOverride || defaultContext;

                const handle = async () => {
                    const givenArray = Array.isArray(givenEvents) ? givenEvents : (givenEvents ? [givenEvents] : []);
                    const whenArray = Array.isArray(whenEvent) ? whenEvent : [whenEvent];
                    const allEvents = [...givenArray, ...whenArray];

                    let eventsToHandle = allEvents;

                    if (wrapEvents) {
                        const getMetadata = defaultMetadata || ((index) => ({
                            messageId: `test-msg-${index}`,
                            streamPosition: BigInt(index + 1),
                            streamName: `test-stream`,
                            globalPosition: BigInt(index + 1),
                        }));

                        eventsToHandle = allEvents.map((event, index) => ({
                            ...event,
                            kind: 'Event' as const,
                            metadata: getMetadata(index),
                        }));
                    }

                    const contextWithMock = { ...context, commandSender: mockCommandSender };
                    await reactor.handle(eventsToHandle, contextWithMock);
                    return mockCommandSender.sentCommands;
                };

                return {
                    then: async (
                        expectedCommand:
                            | Command
                            | Command[]
                            | CommandCheck<Command>
                            | CommandCheck<Command[]>
                    ): Promise<void> => {
                        try {
                            const sentCommands = await handle();

                            if (typeof expectedCommand === 'function') {
                                const checkFn = expectedCommand;
                                if (sentCommands.length === 1) {
                                    assertTrue(
                                        (checkFn as CommandCheck<Command>)(sentCommands[0]),
                                        `Sent command did not match the expected condition: ${JSON.stringify(sentCommands[0])}`
                                    );
                                } else {
                                    assertTrue(
                                        (checkFn as CommandCheck<Command[]>)(sentCommands),
                                        `Sent commands did not match the expected condition: ${JSON.stringify(sentCommands)}`
                                    );
                                }
                                return;
                            }

                            if (Array.isArray(expectedCommand)) {
                                assertTrue(
                                    sentCommands.length === expectedCommand.length,
                                    `Expected ${expectedCommand.length} command(s) to be sent, but ${sentCommands.length} were sent`
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
                                throw new AssertionError(
                                    `Expected 1 command to be sent, but ${sentCommands.length} were sent`
                                );
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
                                    `Expected no commands to be sent, but ${sentCommands.length} command(s) were sent: ${JSON.stringify(sentCommands)}`
                                );
                            }
                        } finally {
                            mockCommandSender.reset();
                        }
                    },

                    thenThrows: async <ErrorType extends Error>(
                        ...args: Parameters<ThenThrows<ErrorType>>
                    ): Promise<void> => {
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

function assertCommandsMatch<Command>(actual: Command, expected: Command, index?: number): void {
    const actualCopy = {...actual} as any;
    const expectedCopy = {...expected} as any;
    if (actualCopy.metadata && expectedCopy.metadata) {
        for (const key in expectedCopy.metadata) {
            assertTrue(
                actualCopy.metadata[key] === expectedCopy.metadata[key],
                `Command${index !== undefined ? ` at index ${index}` : ''} metadata.${key} does not match.\nExpected: ${expectedCopy.metadata[key]}\nActual: ${actualCopy.metadata[key]}`
            );

        }
        delete actualCopy.metadata;
        delete expectedCopy.metadata;
    } else if (actualCopy.metadata && !expectedCopy.metadata) {
        delete actualCopy.metadata;
    }
    assertTrue(
        JSON.stringify(actualCopy) === JSON.stringify(expectedCopy),
        `Command${index !== undefined ? ` at index ${index}` : ''} does not match.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
}

function thenThrowsErrorHandler<ErrorType extends Error>(
    error: unknown,
    args: Parameters<ThenThrows<ErrorType>>,
): void {
    if (error instanceof AssertionError) throw error;

    if (args.length === 0) return;

    if (!isErrorConstructor(args[0])) {
        assertTrue(
            args[0](error as ErrorType),
            `Error didn't match the error condition: ${error?.toString()}`,
        );
        return;
    }

    assertTrue(
        error instanceof args[0],
        `Caught error is not an instance of the expected type: ${error?.toString()}`,
    );

    if (args[1]) {
        assertTrue(
            args[1](error as ErrorType),
            `Error didn't match the error condition: ${error?.toString()}`,
        );
    }
}