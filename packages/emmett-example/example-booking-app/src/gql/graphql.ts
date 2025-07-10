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

export type Listing = {
  __typename?: 'Listing';
  location: Scalars['String'];
  maxGuests: Scalars['Int'];
  pricePerNight: Scalars['Float'];
  propertyId: Scalars['ID'];
  title: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  searchListings: Array<Listing>;
};


export type QuerySearchListingsArgs = {
  location?: InputMaybe<Scalars['String']>;
  maxPrice?: InputMaybe<Scalars['Float']>;
  minGuests?: InputMaybe<Scalars['Int']>;
};

export type SearchListingsQueryVariables = Exact<{
  location?: InputMaybe<Scalars['String']>;
  maxPrice?: InputMaybe<Scalars['Float']>;
  minGuests?: InputMaybe<Scalars['Int']>;
}>;


export type SearchListingsQuery = { __typename?: 'Query', searchListings: Array<{ __typename?: 'Listing', propertyId: string, title: string, location: string, pricePerNight: number, maxGuests: number }> };


export const SearchListingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchListings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"location"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"maxPrice"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"minGuests"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchListings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"location"},"value":{"kind":"Variable","name":{"kind":"Name","value":"location"}}},{"kind":"Argument","name":{"kind":"Name","value":"maxPrice"},"value":{"kind":"Variable","name":{"kind":"Name","value":"maxPrice"}}},{"kind":"Argument","name":{"kind":"Name","value":"minGuests"},"value":{"kind":"Variable","name":{"kind":"Name","value":"minGuests"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"pricePerNight"}},{"kind":"Field","name":{"kind":"Name","value":"maxGuests"}}]}}]}}]} as unknown as DocumentNode<SearchListingsQuery, SearchListingsQueryVariables>;