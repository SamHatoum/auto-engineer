import { recordWhen, recordThen } from './flow-context';
// Typesafe flow testing helpers
export const createFlowSpec = () => {
  return {
    given: (events: any[]) => ({
      when: (command: any) => ({
        then: (expectedEvents: any[]) => {
          recordWhen(command);
          recordThen(...expectedEvents);
        },
        thenThrows: (errorMatcher: (error: Error) => boolean) => {
        }
      }),
      then: (expectedData: any) => {
      }
    }),
    when: (command: any) => ({
      then: (expectedEvents: any[]) => {
        recordWhen(command);
        recordThen(...expectedEvents);
      },
      thenThrows: (errorMatcher: (error: Error) => boolean) => {
      }
    })
  };
};

export const given = (events: any[]) => createFlowSpec().given(events);
export const when = (command: any) => createFlowSpec().when(command);

// GraphQL query testing helper
export const gqlQuery = (query: string) => ({
  query,
  then: (expectedResponse: any) => {

  }
});

// Alternative when function for GraphQL queries
export const whenQuery = (query: any) => ({
  then: (expectedResponse: any) => {

  }
});