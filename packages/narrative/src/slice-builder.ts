import type { Integration } from './types';
import { getCurrentNarrative, addSlice } from './narrative-context';
import type { CommandSlice, QuerySlice, ReactSlice } from './index';

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
    const flow = getCurrentNarrative();
    if (!flow) throw new Error('No active flow');

    // Create a properly typed command slice
    const slice: CommandSlice = {
      type: 'command',
      name,
      client: { specs: [] },
      server: { description: '', specs: { name: '', rules: [] }, data: undefined },
      // Optional fields
      ...(config.eventStream != null && { stream: config.eventStream }),
      ...(config.integration && { via: [config.integration.name] }),
      ...(config.retries != null && { additionalInstructions: `retries: ${config.retries}` }),
    };
    addSlice(slice);
    fn();
  },

  query(name: string, fn: () => void) {
    const flow = getCurrentNarrative();
    if (!flow) throw new Error('No active flow');

    // Create a properly typed query slice
    const slice: QuerySlice = {
      type: 'query',
      name,
      client: { specs: [] },
      server: { description: '', specs: { name: '', rules: [] }, data: undefined },
      // Optional fields
      ...(config.eventStream != null && { stream: config.eventStream }),
      ...(config.integration && { via: [config.integration.name] }),
      ...(config.retries != null && { additionalInstructions: `retries: ${config.retries}` }),
    };

    addSlice(slice);

    // Execute the function which will populate client/server blocks
    fn();
  },

  reaction(name: string, fn: () => void) {
    const flow = getCurrentNarrative();
    if (!flow) throw new Error('No active flow');

    // Create a properly typed react slice (note: 'reaction' -> 'react' for schema compliance)
    const slice: ReactSlice = {
      type: 'react',
      name,
      server: { specs: { name: '', rules: [] }, data: undefined },
      // Optional fields
      ...(config.eventStream != null && { stream: config.eventStream }),
      ...(config.integration && { via: [config.integration.name] }),
      ...(config.retries != null && { additionalInstructions: `retries: ${config.retries}` }),
    };
    addSlice(slice);
    fn();
  },
});
