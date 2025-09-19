// Export only the DSL functions for use in auto.config.ts
export { on, dispatch, fold, autoConfig, getPipelineGraph } from './dsl/index';
export { CommandMetadataService } from './server/command-metadata-service';
export type {
  EventRegistration,
  DispatchAction,
  FoldRegistration,
  DslRegistration,
  ConfigDefinition,
  SettledHandlerConfig,
} from './dsl/types';
export type { CommandMetadata } from './server/command-metadata-service';
