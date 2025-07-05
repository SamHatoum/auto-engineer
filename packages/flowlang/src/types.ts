export type Integration<T extends string = string> = {
  readonly __brand: 'Integration';
  readonly type: T;
  readonly name: string;
};

export const createIntegration = <T extends string>(type: T, name: string): Integration<T> => ({
  __brand: 'Integration' as const,
  type,
  name
} as Integration<T>);

// Data flow types
export interface MessageTarget {
  type: 'Event' | 'Command' | 'State';
  name: string;
  fields?: Record<string, any>;
}

export type Destination = 
  | { type: 'stream'; pattern: string }
  | { type: 'integration'; systems: string[] }
  | { type: 'database'; collection: string }
  | { type: 'topic'; name: string };

export type Origin = 
  | { type: 'projection'; name: string }
  | { type: 'readModel'; name: string }
  | { type: 'database'; collection: string; query?: any }
  | { type: 'api'; endpoint: string; method?: string };

export interface DataSink {
  target: MessageTarget;
  destination: Destination;
  transform?: string;
}

export interface DataSource {
  target: MessageTarget;
  origin: Origin;
  transform?: string;
}

// Branded types for type safety in arrays
export type DataSinkItem = DataSink & { readonly __type: 'sink' };
export type DataSourceItem = DataSource & { readonly __type: 'source' };
export type DataItem = DataSinkItem | DataSourceItem; 