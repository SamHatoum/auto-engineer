import type { Integration } from './types';
import {
  getCurrentFlow,
  getCurrentSlice,
  startClientBlock,
  endClientBlock,
  startServerBlock,
  endServerBlock,
} from './flow-context';

export interface FluentCommandSliceBuilder {
  stream(name: string): FluentCommandSliceBuilder;
  client(fn: () => void): FluentCommandSliceBuilder;
  client(description: string, fn: () => void): FluentCommandSliceBuilder;
  server(fn: () => void): FluentCommandSliceBuilder;
  server(description: string, fn: () => void): FluentCommandSliceBuilder;
  via(integration: Integration | Integration[]): FluentCommandSliceBuilder;
  retries(count: number): FluentCommandSliceBuilder;
}

export interface FluentQuerySliceBuilder {
  client(fn: () => void): FluentQuerySliceBuilder;
  client(description: string, fn: () => void): FluentQuerySliceBuilder;
  server(fn: () => void): FluentQuerySliceBuilder;
  server(description: string, fn: () => void): FluentQuerySliceBuilder;
  request(query: any): FluentQuerySliceBuilder;
}

export interface FluentReactionSliceBuilder {
  server(fn: () => void): FluentReactionSliceBuilder;
  server(description: string, fn: () => void): FluentReactionSliceBuilder;
  via(integration: Integration | Integration[]): FluentReactionSliceBuilder;
  retries(count: number): FluentReactionSliceBuilder;
}

class CommandSliceBuilderImpl implements FluentCommandSliceBuilder {
  constructor(name: string) {
    getCurrentFlow()?.slices.push({ type: 'command', name });
  }

  stream(name: string): FluentCommandSliceBuilder {
    getCurrentSlice().stream = name;
    return this;
  }

  client(fn: () => void): FluentCommandSliceBuilder;
  client(description: string, fn: () => void): FluentCommandSliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    const slice = getCurrentSlice();
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      startClientBlock(slice, description);
      callback();
      endClientBlock();
    }

    return this;
  }

  server(fn: () => void): FluentCommandSliceBuilder;
  server(description: string, fn: () => void): FluentCommandSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    const slice = getCurrentSlice();
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      startServerBlock(slice, description);
      callback();
      endServerBlock();
    }

    return this;
  }

  via(integration: Integration | Integration[]): FluentCommandSliceBuilder {
    const currentSlice = getCurrentSlice();
    if(currentSlice) {
      currentSlice.integration = Array.isArray(integration) ? integration.map(i => i.name) : [integration.name];
    }
    return this;
  }

  retries(count: number): FluentCommandSliceBuilder {
    getCurrentSlice().retries = count;
    return this;
  }
}

class QuerySliceBuilderImpl implements FluentQuerySliceBuilder {
  constructor(name: string) {
    getCurrentFlow()?.slices.push({ type: 'query', name });
  }

  client(fn: () => void): FluentQuerySliceBuilder;
  client(description: string, fn: () => void): FluentQuerySliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    const slice = getCurrentSlice();
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      startClientBlock(slice, description);
      callback();
      endClientBlock();
    }

    return this;
  }

  server(fn: () => void): FluentQuerySliceBuilder;
  server(description: string, fn: () => void): FluentQuerySliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    const slice = getCurrentSlice();
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      startServerBlock(slice, description);
      callback();
      endServerBlock();
    }

    return this;
  }

  request(query: any): FluentQuerySliceBuilder {
    getCurrentSlice().request = query;
    return this;
  }
}

class ReactionSliceBuilderImpl implements FluentReactionSliceBuilder {
  constructor(name: string) {
    getCurrentFlow()?.slices.push({ type: 'reaction', name });
  }

  server(fn: () => void): FluentReactionSliceBuilder;
  server(description: string, fn: () => void): FluentReactionSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentReactionSliceBuilder {
    const slice = getCurrentSlice();
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      startServerBlock(slice, description);
      callback();
      endServerBlock();
    }

    return this;
  }

  via(integration: Integration | Integration[]): FluentReactionSliceBuilder {
    const slice = getCurrentSlice();
    if(slice) {
      slice.integration = Array.isArray(integration) ? integration.map(i => i.name) : [integration.name];
    }
    return this;
  }

  retries(count: number): FluentReactionSliceBuilder {
    getCurrentSlice().retries = count;
    return this;
  }
}

export const commandSlice = (name: string): FluentCommandSliceBuilder =>
    new CommandSliceBuilderImpl(name);

export const querySlice = (name: string): FluentQuerySliceBuilder =>
    new QuerySliceBuilderImpl(name);

export const reactSlice = (name: string): FluentReactionSliceBuilder =>
    new ReactionSliceBuilderImpl(name);