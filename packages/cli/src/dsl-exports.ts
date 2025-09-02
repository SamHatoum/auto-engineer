// Export only the DSL functions for use in auto.config.ts
export { on, dispatch, fold } from './dsl/index';
export type { EventRegistration, DispatchAction, FoldRegistration, DslRegistration } from './dsl/types';
