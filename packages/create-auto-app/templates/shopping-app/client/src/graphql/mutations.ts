import { graphql } from '../gql';

export const EnterShoppingCriteria = graphql(`
  mutation EnterShoppingCriteria($input: EnterShoppingCriteriaInput!) {
    enterShoppingCriteria(input: $input) {
      success
      error {
        type
        message
      }
    }
  }
`);
