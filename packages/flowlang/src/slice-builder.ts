import type { Integration } from './types';

export interface SliceConfig {
  integration?: Integration;
  eventStream?: string;
  retries?: number;
}

export interface SliceBuilder {
  via(integrationOrStream: Integration | string): SliceBuilder;
  retries(count: number): SliceBuilder;
  stream(eventStream: string): SliceBuilder;
  command(name: string, fn: () => void): void;
  query(name: string, fn: () => void): void;
  reaction(name: string, fn: () => void): void;
}

export const createSliceBuilder = (config: SliceConfig = {}): SliceBuilder => ({
  via(integrationOrStream: Integration | string): SliceBuilder {
    if (typeof integrationOrStream === 'string') {
      return createSliceBuilder({ ...config, eventStream: integrationOrStream });
    } else {
      return createSliceBuilder({ ...config, integration: integrationOrStream });
    }
  },
  retries(count: number): SliceBuilder {
    return createSliceBuilder({ ...config, retries: count });
  },
  stream(eventStream: string): SliceBuilder {
    return createSliceBuilder({ ...config, eventStream });
  },
  command(name: string, fn: () => void) {
    console.log(`Slice: ${name} (Command)`, config);
    fn();
  },
  query(name: string, fn: () => void) {
    console.log(`Slice: ${name} (Query)`, config);
    fn();
  },
  reaction(name: string, fn: () => void) {
    console.log(`Slice: ${name} (Reaction)`, config);
    fn();
  }
});

// Legacy slice export removed - use the fluent API instead 