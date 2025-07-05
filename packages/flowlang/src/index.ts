// Core types and utilities
export type { Integration, DataSink, DataSource, DataSinkItem, DataSourceItem, DataItem, MessageTarget, Destination, Origin } from './types';
export { createIntegration } from './types';

// Apollo GraphQL
export { gql } from 'graphql-tag';

// HTTP GET template literal function
export const get = (strings: TemplateStringsArray, ...values: any[]) => {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] || '');
  }, '');
};

// Fluent API
export type { 
  FluentCommandSliceBuilder, 
  FluentQuerySliceBuilder, 
  FluentReactionSliceBuilder 
} from './fluent-builder';
export { commandSlice, querySlice, reactSlice } from './fluent-builder';

// Data flow builders
export { sink, source } from './data-flow-builders';
export type { FieldSelector } from './data-flow-builders';

// Flow language functions
export { flow } from './flow';
export { client, server, specs, should, request, data } from './flow';
export type { SliceType, DataArray } from './flow';

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

// Schema definitions for progressive flow creation
export { 
  FlowNamesSchema as FlowNamesSystemSchema,
  SliceNamesSchema as SliceNamesSystemSchema,
  ClientServerNamesSchema as ClientServerNamesSystemSchema,
  SpecsSchema as SpecsSystemSchema,
  type SpecsSchema,
  type Message,
  type Command,
  type Event,
  type State,
  type Slice,
  type Flow,
  type Integration as SchemaIntegration,
  type MessageField,
  type CommandExample,
  type EventExample,
  type StateExample,
  type CommandSlice,
  type QuerySlice,
  type ReactSlice,
  type FlowNamesSchema as FlowNames,
  type SliceNamesSchema as SliceNames,
  type ClientServerNamesSchema as ClientServerNames,
  type AppSchema
} from './schema'; 