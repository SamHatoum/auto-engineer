import { recordGwtSpec, recordGiven, recordWhen, recordWhenEvents, recordThen } from './flow-context';

function ensureMessageFormat(item: unknown): { type: string; data: Record<string, unknown> } {
  if (typeof item !== 'object' || item === null) {
    throw new Error('Invalid message format');
  }
  const obj = item as Record<string, unknown>;
  if ('type' in obj && typeof obj.type === 'string' && 'data' in obj && typeof obj.data === 'object') {
    return { type: obj.type, data: obj.data as Record<string, unknown> };
  }
  if ('__messageCategory' in obj && typeof obj.type === 'string') {
    const { type, ...rest } = obj;
    return {
      type,
      data: rest as Record<string, unknown>,
    };
  }
  throw new Error('Message must have type and data properties');
}

export const createFlowSpec = () => {
  return {
    given: (events: unknown[]) => {
      recordGwtSpec();
      const formattedEvents = events.map(ensureMessageFormat);
      recordGiven(formattedEvents);

      return {
        when: (command: unknown) => {
          const formattedCommand = ensureMessageFormat(command);
          recordWhen(formattedCommand);

          return {
            then: (expectedEvents: unknown[]) => {
              const formattedEvents = expectedEvents.map(ensureMessageFormat);
              recordThen(...formattedEvents);
            },
            thenThrows: (_errorMatcher: (error: Error) => boolean) => {
              // Handle error cases
              recordThen({
                type: 'Error',
                data: { errorType: 'IllegalStateError', message: 'Error occurred' }
              });
            },
          };
        },
        then: (expectedData: unknown | unknown[]) => {
          // For query slices - given events, then state
          const items = Array.isArray(expectedData) ? expectedData : [expectedData];
          const formattedData = items.map(ensureMessageFormat);
          recordThen(...formattedData);
        },
      };
    },
    when: (commandOrEvents: unknown | unknown[]) => {
      recordGwtSpec();

      if (Array.isArray(commandOrEvents)) {
        // React slice - when events
        const formattedEvents = commandOrEvents.map(ensureMessageFormat);
        recordWhenEvents(formattedEvents);

        return {
          then: (expectedCommands: unknown[]) => {
            const formattedCommands = expectedCommands.map(ensureMessageFormat);
            recordThen(...formattedCommands);
          },
        };
      } else {
        // Command slice - when command
        const formattedCommand = ensureMessageFormat(commandOrEvents);
        recordWhen(formattedCommand);

        return {
          then: (expectedEvents: unknown[]) => {
            const formattedEvents = expectedEvents.map(ensureMessageFormat);
            recordThen(...formattedEvents);
          },
          thenThrows: (_errorMatcher: (error: Error) => boolean) => {
            recordThen({
              type: 'Error',
              data: { errorType: 'IllegalStateError', message: 'Error occurred' }
            });
          },
        };
      }
    },
  };
};

export const given = (events: unknown[]) => createFlowSpec().given(events);
export const when = (commandOrEvents: unknown | unknown[]) => createFlowSpec().when(commandOrEvents);

// GraphQL query testing helper
export const gqlQuery = (query: string) => ({
  query,
  then: (_expectedResponse: unknown) => {
  },
});

// Alternative when function for GraphQL queries
export const whenQuery = (_query: unknown) => ({
  then: (_expectedResponse: unknown) => {
  },
});