/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type AddItemsToCartInput = {
  items: Scalars['String'];
  sessionId: Scalars['String'];
};

export type EnterShoppingCriteriaInput = {
  criteria: Scalars['String'];
  sessionId: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addItemsToCart: MutationResponse;
  enterShoppingCriteria: MutationResponse;
  suggestShoppingItems: MutationResponse;
};

export type MutationAddItemsToCartArgs = {
  input: AddItemsToCartInput;
};

export type MutationEnterShoppingCriteriaArgs = {
  input: EnterShoppingCriteriaInput;
};

export type MutationSuggestShoppingItemsArgs = {
  input: SuggestShoppingItemsInput;
};

export type MutationError = {
  __typename?: 'MutationError';
  message?: Maybe<Scalars['String']>;
  type: Scalars['String'];
};

export type MutationResponse = {
  __typename?: 'MutationResponse';
  error?: Maybe<MutationError>;
  success: Scalars['Boolean'];
};

export type Query = {
  __typename?: 'Query';
  suggestedItems: Array<SuggestedItems>;
};

export type QuerySuggestedItemsArgs = {
  sessionId?: InputMaybe<Scalars['ID']>;
};

export type SuggestShoppingItemsInput = {
  prompt: Scalars['String'];
  sessionId: Scalars['String'];
};

export type SuggestedItems = {
  __typename?: 'SuggestedItems';
  items: Array<SuggestedItemsItems>;
  sessionId: Scalars['String'];
};

export type SuggestedItemsItems = {
  __typename?: 'SuggestedItemsItems';
  name: Scalars['String'];
  productId: Scalars['String'];
  quantity: Scalars['Float'];
  reason: Scalars['String'];
};

export type EnterShoppingCriteriaMutationVariables = Exact<{
  input: EnterShoppingCriteriaInput;
}>;

export type EnterShoppingCriteriaMutation = {
  __typename?: 'Mutation';
  enterShoppingCriteria: {
    __typename?: 'MutationResponse';
    success: boolean;
    error?: { __typename?: 'MutationError'; type: string; message?: string | null } | null;
  };
};

export type GetSuggestedItemsQueryVariables = Exact<{
  sessionId: Scalars['ID'];
}>;

export type GetSuggestedItemsQuery = {
  __typename?: 'Query';
  suggestedItems: Array<{
    __typename?: 'SuggestedItems';
    items: Array<{
      __typename?: 'SuggestedItemsItems';
      productId: string;
      name: string;
      quantity: number;
      reason: string;
    }>;
  }>;
};

export const EnterShoppingCriteriaDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'EnterShoppingCriteria' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'EnterShoppingCriteriaInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'enterShoppingCriteria' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'error' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EnterShoppingCriteriaMutation, EnterShoppingCriteriaMutationVariables>;
export const GetSuggestedItemsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetSuggestedItems' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sessionId' } },
          type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'suggestedItems' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sessionId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sessionId' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'productId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'quantity' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetSuggestedItemsQuery, GetSuggestedItemsQueryVariables>;
