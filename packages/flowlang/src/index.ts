import { z } from 'zod';

// Core types and utilities
export type {
  Integration,
  DataSink,
  DataSource,
  DataSinkItem,
  DataSourceItem,
  DataItem,
  MessageTarget,
  Destination,
  Origin,
  State,
  Command,
  Event,
} from './types';
export { MessageTargetSchema, DataSinkSchema, DataSourceSchema } from './schema';
export { createIntegration } from './types';
export { registerIntegrations } from './integration-registry';

// Apollo GraphQL
export { gql } from 'graphql-tag';

// HTTP GET template literal function
export const get = (strings: TemplateStringsArray, ...values: unknown[]) => {
  return strings.reduce((result, str, i) => {
    const value = values[i];
    return result + str + (value !== undefined && value !== null ? String(value) : '');
  }, '');
};

// Fluent API
export type { FluentCommandSliceBuilder, FluentQuerySliceBuilder, FluentReactionSliceBuilder } from './fluent-builder';
export { commandSlice, querySlice, reactSlice } from './fluent-builder';

// Data flow builders
export { sink, source } from './data-flow-builders';
export type { FieldSelector } from './data-flow-builders';

// Flow language functions
export { flow } from './flow';
export { client, server, specs, should, request, data } from './flow';
export type { SliceTypeValueInterface } from './flow';
export { SliceType } from './flow';

// Flow conversion utilities
export { getFlow } from './loader/getFlow';
export { getFlows } from './loader/getFlows';

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
  createTypedStateBuilder,
} from './builders';

// Testing helpers
export { createFlowSpec, given, when } from './testing';

// Schema definitions for progressive flow creation
export {
  FlowNamesSchema as FlowNamesSystemSchema,
  SliceNamesSchema as SliceNamesSystemSchema,
  ClientServerNamesSchema as ClientServerNamesSystemSchema,
  SpecsSchema as SpecsSystemSchema,
  MessageFieldSchema,
  MessageSchema,
  CommandSchema,
  EventSchema,
  StateSchema,
  IntegrationSchema,
  CommandSliceSchema,
  QuerySliceSchema,
  ReactSliceSchema,
  SliceSchema,
  FlowSchema,
  AppSchema as AppSchemaZod,
  SpecsSchema,
  EventExampleSchema,
  CommandExampleSchema,
} from './schema';

// Export the AppSchema type
import {
  AppSchema as ImportedAppSchema,
  CommandExampleSchema,
  ErrorExampleSchema,
  EventExampleSchema,
  FlowSchema,
  SliceSchema,
  SpecsSchema,
  StateExampleSchema,
  QuerySliceSchema,
  ReactSliceSchema,
  MessageSchema,
  CommandSliceSchema,
} from './schema';
export type AppSchema = z.infer<typeof ImportedAppSchema>;

// Export additional required types
export type CommandExample = z.infer<typeof CommandExampleSchema>;
export type EventExample = z.infer<typeof EventExampleSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type Slice = z.infer<typeof SliceSchema>;
export type SpecsSchemaType = z.infer<typeof SpecsSchema>;
export type StateExample = z.infer<typeof StateExampleSchema>;
export type ErrorExample = z.infer<typeof ErrorExampleSchema>;
export type QuerySlice = z.infer<typeof QuerySliceSchema>;
export type ReactSlice = z.infer<typeof ReactSliceSchema>;
export type CommandSlice = z.infer<typeof CommandSliceSchema>;
export type Message = z.infer<typeof MessageSchema>;

// Commands
export {
  exportSchemaCommandHandler,
  handleExportSchemaCommand,
  type ExportSchemaCommand,
  type SchemaExportedEvent,
  type SchemaExportFailedEvent,
} from './commands/export-schema';
export {
  createExampleCommandHandler,
  handleCreateExampleCommand,
  type CreateExampleCommand,
  type ExampleCreatedEvent,
  type ExampleCreationFailedEvent,
} from './commands/create-example';
