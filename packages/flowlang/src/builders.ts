import { typedSink, typedSource } from './data-flow-builders';

// Generic types for events and commands - these should be extended by consumers
export type EventUnion = any;
export type CommandUnion = any;
export type StateUnion = any;

// Type for the result of a builder call
export interface BuilderResult {
  type: string;
  data: any;
  metadata?: any;
  __messageCategory?: 'event' | 'command' | 'state';
}

// IDE-friendly event and command builders
export const createEventBuilder = <T extends { type: string; data: any }>() => {
  return new Proxy({} as any, {
    get(target: any, eventType: string) {
      return (data: any) => ({
        type: eventType,
        data,
        __messageCategory: 'event'
      });
    }
  }) as {
    [K in T['type']]: (
      data: Extract<T, { type: K }>['data']
    ) => Extract<T, { type: K }> & { __messageCategory: 'event' }
  };
};

export const createCommandBuilder = <T extends { type: string; data: any; metadata?: any }>() => {
  return new Proxy({} as any, {
    get(target: any, commandType: string) {
      return (data: any, metadata?: any) => ({
        type: commandType,
        data,
        ...(metadata && { metadata }),
        __messageCategory: 'command'
      });
    }
  }) as {
    [K in T['type']]: (
      data: Extract<T, { type: K }>['data'],
      metadata?: Extract<T, { type: K }>['metadata']
    ) => Extract<T, { type: K }> & { __messageCategory: 'command' }
  };
};

export const createStateBuilder = <T>() => {
  return new Proxy({} as any, {
    get(target: any, stateType: string) {
      return (data: any) => ({
        type: stateType,
        data,
        __messageCategory: 'state'
      });
    }
  }) as {
    [K in keyof T]: T[K] extends new (...args: any[]) => any 
      ? (data: any) => { type: string; data: any; __messageCategory: 'state' }
      : (data: T[K]) => { type: string; data: T[K]; __messageCategory: 'state' }
  };
};

// Type for sink and source functions - using any for now due to TypeScript limitations
export type TypedSinkFunction = (builder: BuilderResult) => any;
export type TypedSourceFunction = (builder: BuilderResult) => any;

// Combined builder factory with fluent API
export const createBuilders = () => ({
  events: <E extends { type: string; data: any }>() => ({
    commands: <C extends { type: string; data: any; metadata?: any }>() => ({
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
          source
        };
      }
    })
  })
});

// Alternative: Create explicit builders for better IDE support
export const createTypedEventBuilder = <T extends { type: string; data: any }>() => {
  return {
    create: <K extends T['type']>(
      type: K,
      data: Extract<T, { type: K }>['data']
    ): Extract<T, { type: K }> => ({
      type,
      data
    } as any)
  };
};

export const createTypedCommandBuilder = <T extends { type: string; data: any; metadata?: any }>() => {
  return {
    create: <K extends T['type']>(
      type: K,
      data: Extract<T, { type: K }>['data'],
      metadata?: Extract<T, { type: K }>['metadata']
    ): Extract<T, { type: K }> => ({
      type,
      data,
      ...(metadata && { metadata })
    } as any)
  };
};

export const createTypedStateBuilder = <T extends { type: string; data: any }>() => {
  return {
    create: <K extends T['type']>(
      type: K,
      data: Extract<T, { type: K }>['data']
    ): Extract<T, { type: K }> => ({
      type,
      data
    } as any)
  };
};

// Default builders for backward compatibility
export const event = createEventBuilder<EventUnion>();
export const command = createCommandBuilder<CommandUnion>();
export const state = createStateBuilder<StateUnion>(); 