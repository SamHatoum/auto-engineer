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
export type {
  FluentCommandSliceBuilder,
  FluentQuerySliceBuilder,
  FluentReactionSliceBuilder,
  FluentExperienceSliceBuilder,
} from './fluent-builder';
export { command, query, react, experience, decide, evolve } from './fluent-builder';

// Data flow builders
export { sink, source } from './data-flow-builders';
export type { FieldSelector } from './data-flow-builders';

// Flow language functions
export { flow } from './flow';
export { client, server, specs, should, request, data, rule, example } from './flow';
export type { SliceTypeValueInterface } from './flow';
export { SliceType } from './flow';

// Flow conversion utilities
export { getFlows } from './getFlows';
export { modelToFlow } from './transformers/model-to-flow';

// Testing helpers
export { createFlowSpec, given, when } from './testing';

// Schema definitions for progressive flow creation
export {
  FlowNamesSchema as FlowNamesSystemSchema,
  SliceNamesSchema as SliceNamesSystemSchema,
  ClientServerNamesSchema as ClientServerNamesSystemSchema,
  modelSchema as SpecsSystemSchema,
  MessageFieldSchema,
  MessageSchema,
  CommandSchema,
  EventSchema,
  StateSchema,
  IntegrationSchema,
  CommandSliceSchema,
  QuerySliceSchema,
  ReactSliceSchema,
  ExperienceSliceSchema,
  SliceSchema,
  FlowSchema,
  modelSchema,
  EventExampleSchema,
  CommandExampleSchema,
  ExampleSchema,
  RuleSchema,
  SpecSchema,
} from './schema';

import {
  CommandExampleSchema,
  ErrorExampleSchema,
  EventExampleSchema,
  FlowSchema,
  SliceSchema,
  modelSchema,
  StateExampleSchema,
  QuerySliceSchema,
  ReactSliceSchema,
  ExperienceSliceSchema,
  MessageSchema,
  MessageFieldSchema,
  CommandSliceSchema,
  ExampleSchema,
  RuleSchema,
  SpecSchema,
} from './schema';
export type Model = z.infer<typeof modelSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type CommandExample = z.infer<typeof CommandExampleSchema>;
export type EventExample = z.infer<typeof EventExampleSchema>;
export type Slice = z.infer<typeof SliceSchema>;
export type StateExample = z.infer<typeof StateExampleSchema>;
export type ErrorExample = z.infer<typeof ErrorExampleSchema>;
export type QuerySlice = z.infer<typeof QuerySliceSchema>;
export type ReactSlice = z.infer<typeof ReactSliceSchema>;
export type CommandSlice = z.infer<typeof CommandSliceSchema>;
export type ExperienceSlice = z.infer<typeof ExperienceSliceSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Example = z.infer<typeof ExampleSchema>;
export type MessageField = z.infer<typeof MessageFieldSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Spec = z.infer<typeof SpecSchema>;

export {
  commandHandler as exportSchemaCommandHandler,
  type ExportSchemaCommand,
  type ExportSchemaEvents,
  type SchemaExportedEvent,
  type SchemaExportFailedEvent,
} from './commands/export-schema';

import { commandHandler as exportSchemaHandler } from './commands/export-schema';
export const COMMANDS = [exportSchemaHandler];

// ID assignment utilities
export { addAutoIds, hasAllIds } from './id';
