// Generic types for events and commands - these should be extended by consumers
export type EventUnion = any;
export type CommandUnion = any;
export type StateUnion = any;

// IDE-friendly event and command builders
export const createEventBuilder = <T extends { type: string; data: any }>() => {
  return new Proxy({} as any, {
    get(target: any, eventType: string) {
      return (data: any) => ({
        type: eventType,
        data
      });
    }
  }) as {
    [K in T['type']]: (
      data: Extract<T, { type: K }>['data']
    ) => Extract<T, { type: K }>
  };
};

export const createCommandBuilder = <T extends { type: string; data: any; metadata?: any }>() => {
  return new Proxy({} as any, {
    get(target: any, commandType: string) {
      return (data: any, metadata?: any) => ({
        type: commandType,
        data,
        ...(metadata && { metadata })
      });
    }
  }) as {
    [K in T['type']]: (
      data: Extract<T, { type: K }>['data'],
      metadata?: Extract<T, { type: K }>['metadata']
    ) => Extract<T, { type: K }>
  };
};

export const createStateBuilder = <T>() => {
  return new Proxy({} as any, {
    get(target: any, stateType: string) {
      return (data: any) => ({
        type: stateType,
        data
      });
    }
  }) as {
    [K in keyof T]: T[K] extends new (...args: any[]) => any 
      ? (data: any) => { type: string; data: any }
      : (data: T[K]) => { type: string; data: T[K] }
  };
};

// Combined builder factory with fluent API
export const createBuilders = () => ({
  events: <E extends { type: string; data: any }>() => ({
    commands: <C extends { type: string; data: any; metadata?: any }>() => ({
      state: <S>() => ({
        Events: createEventBuilder<E>(),
        Commands: createCommandBuilder<C>(),
        State: createStateBuilder<S>()
      })
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