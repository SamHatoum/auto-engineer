import { typedSink, typedSource } from './data-flow-builders';

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
  }) as {
    [K in keyof T]: T[K] extends new (...args: unknown[]) => unknown
      ? (data: Record<string, unknown>) => { type: string; data: Record<string, unknown>; __messageCategory: 'state' }
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
      state: <S>() => {
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
        };
      },
    }),
  }),
});

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
