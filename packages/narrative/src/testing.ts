// Legacy testing functions - deprecated, use new specs/rule/example API instead
// This module is kept for backward compatibility but the functions are no-ops

export const createNarrativeSpec = () => {
  console.warn('createNarrativeSpec is deprecated. Use specs/rule/example API instead.');
  return {
    given: (_events: unknown[]) => ({
      when: (_command: unknown) => ({
        then: (_expectedEvents: unknown[]) => {},
        thenThrows: (_errorMatcher: (error: Error) => boolean) => {},
      }),
      then: (_expectedData: unknown | unknown[]) => {},
    }),
    when: (_commandOrEvents: unknown | unknown[]) => ({
      then: (_expected: unknown[]) => {},
      thenThrows: (_errorMatcher: (error: Error) => boolean) => {},
    }),
  };
};

export const given = (_events: unknown[]) => {
  console.warn('given is deprecated. Use specs/rule/example API instead.');
  return createNarrativeSpec().given(_events);
};

export const when = (_commandOrEvents: unknown | unknown[]) => {
  console.warn('when is deprecated. Use specs/rule/example API instead.');
  return createNarrativeSpec().when(_commandOrEvents);
};

// GraphQL query testing helper
export const gqlQuery = (query: string) => ({
  query,
  then: (_expectedResponse: unknown) => {},
});

// Alternative when function for GraphQL queries
export const whenQuery = (_query: unknown) => ({
  then: (_expectedResponse: unknown) => {},
});
