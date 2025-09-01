import { graphql } from '../gql';

export const GetSuggestedItems = graphql(`
  query GetSuggestedItems($sessionId: ID!) {
    suggestedItems(sessionId: $sessionId) {
      items {
        productId
        name
        quantity
        reason
      }
    }
  }
`);
