import { ZodTypeAny } from 'zod';

/* eslint-disable @typescript-eslint/no-explicit-any */
type IntegrationHandler = (...args: any[]) => Promise<any>;

// Enhanced WithSchema type that includes schemas for each handler
type WithSchema<T extends Record<string, IntegrationHandler>> = T & {
  schema?: {
    [K in keyof T]?: ZodTypeAny;
  };
};

export interface Integration<
  Type extends string = string,
  Q extends Record<string, IntegrationHandler> = Record<string, IntegrationHandler>,
  C extends Record<string, IntegrationHandler> = Record<string, IntegrationHandler>,
  R extends Record<string, IntegrationHandler> = Record<string, IntegrationHandler>,
> {
  readonly __brand: 'Integration';
  readonly type: Type;
  readonly name: string;
  readonly Queries?: WithSchema<Q>;
  readonly Commands?: WithSchema<C>;
  readonly Reactions?: WithSchema<R>;
}

export const createIntegration = <T extends string>(type: T, name: string): Integration<T> =>
  ({
    __brand: 'Integration' as const,
    type,
    name,
  }) as Integration<T>;

// Data flow types (keeping existing types)
export interface MessageTarget {
  type: 'Event' | 'Command' | 'State';
  name: string;
  fields?: Record<string, unknown>;
}

export interface StreamDestination {
  type: 'stream';
  pattern: string;
}

export interface IntegrationDestination {
  type: 'integration';
  systems: string[];
  message?: {
    name: string;
    type: 'command' | 'query' | 'reaction';
  };
}

export interface DatabaseDestination {
  type: 'database';
  collection: string;
}

export interface TopicDestination {
  type: 'topic';
  name: string;
}

export type Destination = StreamDestination | IntegrationDestination | DatabaseDestination | TopicDestination;

// Helper functions to create destinations
export const createStreamDestination = (pattern: string): StreamDestination => ({ type: 'stream', pattern });
export const createIntegrationDestination = (systems: string[]): IntegrationDestination => ({
  type: 'integration',
  systems,
});
export const createDatabaseDestination = (collection: string): DatabaseDestination => ({
  type: 'database',
  collection,
});
export const createTopicDestination = (name: string): TopicDestination => ({ type: 'topic', name });

export interface ProjectionOrigin {
  type: 'projection';
  name: string;
}

export interface ReadModelOrigin {
  type: 'readModel';
  name: string;
}

export interface DatabaseOrigin {
  type: 'database';
  collection: string;
  query?: Record<string, unknown>;
}

export interface ApiOrigin {
  type: 'api';
  endpoint: string;
  method?: string;
}

export interface IntegrationOrigin {
  type: 'integration';
  systems: string[];
}

export type Origin = ProjectionOriginWithId | ReadModelOrigin | DatabaseOrigin | ApiOrigin | IntegrationOrigin;

export interface ProjectionOriginWithId {
  type: 'projection';
  name: string;
  idField: string;
}

// Helper functions to create origins
export const createProjectionOrigin = (name: string): ProjectionOrigin => ({ type: 'projection', name });
export const createReadModelOrigin = (name: string): ReadModelOrigin => ({ type: 'readModel', name });
export const createDatabaseOrigin = (collection: string, query?: Record<string, unknown>): DatabaseOrigin => ({
  type: 'database',
  collection,
  query,
});
export const createApiOrigin = (endpoint: string, method?: string): ApiOrigin => ({ type: 'api', endpoint, method });
export const createIntegrationOrigin = (systems: string[]): IntegrationOrigin => ({ type: 'integration', systems });

export interface DataSink {
  target: MessageTarget;
  destination: Destination;
  transform?: string;
  _additionalInstructions?: string;
  _withState?: DataSource;
}

export interface DataSource {
  target: MessageTarget;
  origin: Origin;
  transform?: string;
  _additionalInstructions?: string;
}

// Branded types for type safety in arrays
export interface DataSinkItem extends DataSink {
  readonly __type: 'sink';
}

export interface DataSourceItem extends DataSource {
  readonly __type: 'source';
}

export interface DataItem {
  __type: 'sink' | 'source';
}

type DefaultRecord = Record<string, unknown>;

export type State<
  StateType extends string = string,
  StateData extends DefaultRecord = DefaultRecord,
  EventMetaData extends DefaultRecord | undefined = undefined,
> = Readonly<
  EventMetaData extends undefined
    ? {
        type: StateType;
        data: StateData;
      }
    : {
        type: StateType;
        data: StateData;
        metadata: EventMetaData;
      }
> & {
  readonly kind?: 'State';
};

export interface DefaultCommandMetadata extends Record<string, unknown> {
  now: Date;
}

export type Command<
  CommandType extends string = string,
  CommandData extends DefaultRecord = DefaultRecord,
  CommandMetaData extends DefaultRecord | undefined = undefined,
> = Readonly<
  CommandMetaData extends undefined
    ? {
        type: CommandType;
        data: Readonly<CommandData>;
        metadata?: DefaultCommandMetadata | undefined;
      }
    : {
        type: CommandType;
        data: CommandData;
        metadata: CommandMetaData;
      }
> & {
  readonly kind?: 'Command';
};

export type Event<
  EventType extends string = string,
  EventData extends DefaultRecord = DefaultRecord,
  EventMetaData extends DefaultRecord | undefined = undefined,
> = Readonly<
  EventMetaData extends undefined
    ? {
        type: EventType;
        data: EventData;
      }
    : {
        type: EventType;
        data: EventData;
        metadata: EventMetaData;
      }
> & {
  readonly kind?: 'Event';
};
