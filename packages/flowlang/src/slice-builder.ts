import type { Integration } from './types';
import { getCurrentFlow } from './flow-context';

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
    fn();
    const flow = getCurrentFlow();
    if (flow) {
      flow.slices.push({
        type: 'command',
        name,
        stream: config.eventStream,
        retries: config.retries,
        integration: config.integration?.name,
        client: undefined,
        server: undefined,
      });
    }
  },

  query(name: string, fn: () => void) {
    fn();
    const flow = getCurrentFlow();
    if (flow) {
      flow.slices.push({
        type: 'query',
        name,
        stream: config.eventStream,
        retries: config.retries,
        integration: config.integration?.name,
        client: undefined,
        server: undefined,
      });
    }
  },

  reaction(name: string, fn: () => void) {
    fn();
    const flow = getCurrentFlow();
    if (flow) {
      flow.slices.push({
        type: 'reaction',
        name,
        stream: config.eventStream,
        retries: config.retries,
        integration: config.integration?.name,
        server: undefined,
      });
    }
  },
});