import { recordWhen, recordThen } from './flow-context';
// Typesafe flow testing helpers
export const createFlowSpec = () => {
  return {
    given: (_events: unknown[]) => ({
      when: (command: unknown) => ({
        then: (expectedEvents: unknown[]) => {
          recordWhen(command as Record<string, unknown>);
          recordThen(...(expectedEvents as Record<string, unknown>[]));
        },
        thenThrows: (_errorMatcher: (error: Error) => boolean) => {},
      }),
      then: (_expectedData: unknown) => {},
    }),
    when: (command: unknown) => ({
      then: (expectedEvents: unknown[]) => {
        recordWhen(command as Record<string, unknown>);
        recordThen(...(expectedEvents as Record<string, unknown>[]));
      },
      thenThrows: (_errorMatcher: (error: Error) => boolean) => {},
    }),
  };
};

export const given = (events: unknown[]) => createFlowSpec().given(events);
export const when = (command: unknown) => createFlowSpec().when(command);

// GraphQL query testing helper
export const gqlQuery = (query: string) => ({
  query,
  then: (_expectedResponse: unknown) => {},
});

// Alternative when function for GraphQL queries
export const whenQuery = (_query: unknown) => ({
  then: (_expectedResponse: unknown) => {},
});
