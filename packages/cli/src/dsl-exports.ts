// Export only the DSL functions for use in auto.config.ts
export { on, dispatch, fold, autoConfig } from './dsl/index';
export type {
  EventRegistration,
  DispatchAction,
  FoldRegistration,
  DslRegistration,
  ConfigDefinition,
} from './dsl/types';
