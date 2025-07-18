import { startGwtSpec, recordGiven, recordWhen, recordWhenEvents, recordThen } from './flow-context';

// Helper to ensure objects have type and data properties
function ensureMessageFormat(item: unknown): { type: string; data: Record<string, unknown> } {
  if (typeof item !== 'object' || item === null) {
    throw new Error('Invalid message format');
  }

  const obj = item as Record<string, unknown>;

  // If it already has type and data, return as is
  if ('type' in obj && typeof obj.type === 'string' && 'data' in obj && typeof obj.data === 'object') {
    return obj as { type: string; data: Record<string, unknown> };
  }

  // If it has __messageCategory, extract type from the object itself
  if ('__messageCategory' in obj && 'type' in obj && typeof obj.type === 'string') {
    const { type, ...data } = obj;
    // Remove __messageCategory from data
    delete data.__messageCategory;
    return { type, data };
  }

  throw new Error('Message must have type and data properties');
}

export const createFlowSpec = () => {
  return {
    given: (events: unknown[]) => {
      startGwtSpec();
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
        then: (expectedData: unknown) => {
          // For query slices - given events, then state
          const formattedData = ensureMessageFormat(expectedData);
          recordThen(formattedData);
        },
      };
    },
    when: (commandOrEvents: unknown | unknown[]) => {
      startGwtSpec();

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