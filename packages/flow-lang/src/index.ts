// Core types and utilities
export type { Integration } from './types';
export { createIntegration } from './types';

// Apollo GraphQL
export { gql } from 'apollo-server';

// Fluent API
export type { 
  FluentCommandSliceBuilder, 
  FluentQuerySliceBuilder, 
  FluentReactionSliceBuilder 
} from './fluent-builder';
export { commandSlice, querySlice, reactSlice } from './fluent-builder';

// Flow language functions
export { flow } from './flow';
export { client, server, specs, should, request } from './flow';

// Event and command builders
export { 
  event, 
  command, 
  state,
  createEventBuilder, 
  createCommandBuilder,
  createStateBuilder,
  createBuilders,
  createTypedEventBuilder,
  createTypedCommandBuilder,
  createTypedStateBuilder
} from './builders';

// Testing helpers
export { createFlowSpec, given, when } from './testing'; 