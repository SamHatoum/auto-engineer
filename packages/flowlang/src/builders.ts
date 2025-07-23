import { typedSink, typedSource } from './data-flow-builders';
import {Message} from "./index";

// Generic interfaces for events and commands - these should be extended by consumers
export interface EventUnion extends Record<string, unknown> {
  type: string;
  data: Record<string, unknown>;
  // This interface should be extended by specific event types
  __eventUnionMarker?: never;
}
export interface CommandUnion extends Record<string, unknown> {
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  // This interface should be extended by specific command types
  __commandUnionMarker?: never;
}
export interface StateUnion extends Record<string, unknown> {
  // This interface should be extended by specific state types
  __stateUnionMarker?: never;
}

// Type for the result of a builder call
export interface BuilderResult {
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  __messageCategory?: 'event' | 'command' | 'state';
}

// IDE-friendly event and command builders
export const createEventBuilder = <T extends { type: string; data: Record<string, unknown> }>() => {
  return new Proxy({} as Record<string, unknown>, {
    get(target: Record<string, unknown>, eventType: string) {
      return (data: Record<string, unknown>) => ({
        type: eventType,
        data,
        __messageCategory: 'event' as const,
      });
    },
  }) as {
    [K in T['type']]: (
      data: Extract<T, { type: K }>['data'],
    ) => Extract<T, { type: K }> & { __messageCategory: 'event' };
  };
};

export const createCommandBuilder = <
  T extends { type: string; data: Record<string, unknown>; metadata?: Record<string, unknown> },
>() => {
  return new Proxy({} as Record<string, unknown>, {
    get(target: Record<string, unknown>, commandType: string) {
      return (data: Record<string, unknown>, metadata?: Record<string, unknown>) => ({
        type: commandType,
        data,
        ...(metadata !== undefined && { metadata }),
        __messageCategory: 'command' as const,
      });
    },
  }) as {
    [K in T['type']]: (
      data: Extract<T, { type: K }>['data'],
      metadata?: Extract<T, { type: K }>['metadata'],
    ) => Extract<T, { type: K }> & { __messageCategory: 'command' };
  };
};

export const createStateBuilder = <T>() => {
  return new Proxy({} as Record<string, unknown>, {
    get(target: Record<string, unknown>, stateType: string) {
      return (data: Record<string, unknown>) => ({
        type: stateType,
        data,
        __messageCategory: 'state' as const,
      });
    },
  }) as T extends { type: string; data: Record<string, unknown> }
    ? {
        [K in T['type']]: (
          data: Extract<T, { type: K }>['data'],
        ) => Extract<T, { type: K }> & { __messageCategory: 'state' };
      }
    : {
        [K in keyof T]: T[K] extends { data: infer StateData }
          ? (data: StateData) => { type: string; data: StateData; __messageCategory: 'state' }
          : (data: T[K]) => { type: string; data: T[K]; __messageCategory: 'state' };
      };
};

// Type for sink and source functions
export interface TypedSinkFunction {
  (builder: BuilderResult): Record<string, unknown>;
}

export interface TypedSourceFunction {
  (builder: BuilderResult): Record<string, unknown>;
}

// Combined builder factory with fluent API
export const createBuilders = () => ({
  events: <E extends { type: string; data: Record<string, unknown> }>() => ({
    commands: <C extends { type: string; data: Record<string, unknown>; metadata?: Record<string, unknown> }>() => ({
      state: <S extends object>() => {
        const Events = createEventBuilder<E>();
        const Commands = createCommandBuilder<C>();
        const State = createStateBuilder<S>();

        // Use the imported typed functions
        const sink = typedSink;
        const source = typedSource;

        return {
          Events,
          Commands,
          State,
          sink,
          source,
          __definitions: {
            commands: extractCommandDefs<C>(),
            events: extractEventDefs<E>(),
            state: extractStateDefs<S>(),
          },
        };
      },
    }),
  }),
});

function extractCommandDefs<C extends { type: string; data: Record<string, unknown>; metadata?: Record<string, unknown> }>(): Message[] {
  const commandTypes = new Set<string>();
  try {
    const dummy = {} as C;
    if ('type' in dummy) commandTypes.add(dummy.type);
  } catch { /* empty */ }
  return Array.from(commandTypes).map((type) => ({
    type: 'command',
    name: type,
    fields: [], // no way to infer statically here
    metadata: { version: 1 },
  }));
}

function extractEventDefs<E extends { type: string; data: Record<string, unknown> }>(): Message[] {
  const eventTypes = new Set<string>();
  try {
    const dummy = {} as E;
    if ('type' in dummy) eventTypes.add(dummy.type);
  } catch { /* empty */ }
  return Array.from(eventTypes).map((type) => ({
    type: 'event',
    name: type,
    fields: [],
    source: 'internal',
    metadata: { version: 1 },
  }));
}

function extractStateDefs<S extends object>(): Message[] {
  return Object.keys({} as S).map((name) => ({
    type: 'state',
    name,
    fields: [],
    metadata: { version: 1 },
  }));
}

// Alternative: Create explicit builders for better IDE support
export const createTypedEventBuilder = <T extends { type: string; data: Record<string, unknown> }>() => {
  return {
    create: <K extends T['type']>(type: K, data: Extract<T, { type: K }>['data']): Extract<T, { type: K }> =>
      ({
        type,
        data,
      }) as Extract<T, { type: K }>,
  };
};

export const createTypedCommandBuilder = <
  T extends { type: string; data: Record<string, unknown>; metadata?: Record<string, unknown> },
>() => {
  return {
    create: <K extends T['type']>(
      type: K,
      data: Extract<T, { type: K }>['data'],
      metadata?: Extract<T, { type: K }>['metadata'],
    ): Extract<T, { type: K }> =>
      ({
        type,
        data,
        ...(metadata !== undefined && { metadata }),
      }) as Extract<T, { type: K }>,
  };
};

export const createTypedStateBuilder = <T extends { type: string; data: Record<string, unknown> }>() => {
  return {
    create: <K extends T['type']>(type: K, data: Extract<T, { type: K }>['data']): Extract<T, { type: K }> =>
      ({
        type,
        data,
      }) as Extract<T, { type: K }>,
  };
};

// Default builders for backward compatibility
export const event = createEventBuilder<EventUnion>();
export const command = createCommandBuilder<CommandUnion>();
export const state = createStateBuilder<StateUnion>();
