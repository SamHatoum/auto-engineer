import type { Integration } from './types';
import {
  addSlice,
  startClientBlock,
  endClientBlock,
  startServerBlock,
  endServerBlock,
  getCurrentSlice,
} from './flow-context';
import { CommandSlice, QuerySlice, ReactSlice } from './index';
import { print, ASTNode } from 'graphql';

export interface FluentCommandSliceBuilder {
  stream(name: string): FluentCommandSliceBuilder;
  client(fn: () => void): FluentCommandSliceBuilder;
  client(description: string, fn: () => void): FluentCommandSliceBuilder;
  server(fn: () => void): FluentCommandSliceBuilder;
  server(description: string, fn: () => void): FluentCommandSliceBuilder;
  via(integration: Integration | Integration[]): FluentCommandSliceBuilder;
  retries(count: number): FluentCommandSliceBuilder;
  request(mutation: unknown): FluentCommandSliceBuilder;
}

export interface FluentQuerySliceBuilder {
  client(fn: () => void): FluentQuerySliceBuilder;
  client(description: string, fn: () => void): FluentQuerySliceBuilder;
  server(fn: () => void): FluentQuerySliceBuilder;
  server(description: string, fn: () => void): FluentQuerySliceBuilder;
  request(query: unknown): FluentQuerySliceBuilder;
}

export interface FluentReactionSliceBuilder {
  server(fn: () => void): FluentReactionSliceBuilder;
  server(description: string, fn: () => void): FluentReactionSliceBuilder;
  via(integration: Integration | Integration[]): FluentReactionSliceBuilder;
  retries(count: number): FluentReactionSliceBuilder;
}

class CommandSliceBuilderImpl implements FluentCommandSliceBuilder {
  private slice: CommandSlice;

  constructor(name: string) {
    this.slice = {
      type: 'command',
      name,
      client: { description: '', specs: [] },
      server: { description: '', gwt: [], data: undefined },
    };
    addSlice(this.slice);
  }

  stream(name: string): FluentCommandSliceBuilder {
    this.slice.stream = name;
    return this;
  }

  client(fn: () => void): FluentCommandSliceBuilder;
  client(description: string, fn: () => void): FluentCommandSliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        startClientBlock(slice, description);
        callback();
        endClientBlock();
      }
    }

    return this;
  }

  server(fn: () => void): FluentCommandSliceBuilder;
  server(description: string, fn: () => void): FluentCommandSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        startServerBlock(slice, description);
        callback();
        endServerBlock();
      }
    }

    return this;
  }

  via(integration: Integration | Integration[]): FluentCommandSliceBuilder {
    const integrations = Array.isArray(integration) ? integration : [integration];
    this.slice.via = integrations.map((i) => i.name);
    return this;
  }

  retries(count: number): FluentCommandSliceBuilder {
    // Store retries in additionalInstructions or metadata
    this.slice.additionalInstructions = `retries: ${count}`;
    return this;
  }

  request(query: unknown): FluentCommandSliceBuilder {
    if (typeof query === 'string') {
      this.slice.request = query;
    } else if (
      query !== null &&
      query !== undefined &&
      typeof query === 'object' &&
      'kind' in query &&
      query.kind === 'Document'
    ) {
      this.slice.request = print(query as ASTNode); // ✅ convert AST to SDL string
    } else {
      throw new Error('Invalid GraphQL query format');
    }
    return this;
  }
}

class QuerySliceBuilderImpl implements FluentQuerySliceBuilder {
  private slice: QuerySlice;

  constructor(name: string) {
    this.slice = {
      type: 'query',
      name,
      client: { description: '', specs: [] },
      server: { description: '', gwt: [], data: undefined },
    };
    addSlice(this.slice);
  }

  client(fn: () => void): FluentQuerySliceBuilder;
  client(description: string, fn: () => void): FluentQuerySliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        startClientBlock(slice, description);
        callback();
        endClientBlock();
      }
    }

    return this;
  }

  server(fn: () => void): FluentQuerySliceBuilder;
  server(description: string, fn: () => void): FluentQuerySliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        startServerBlock(slice, description);
        callback();
        endServerBlock();
      }
    }

    return this;
  }

  request(query: unknown): FluentQuerySliceBuilder {
    if (typeof query === 'string') {
      this.slice.request = query;
    } else if (
      query !== null &&
      query !== undefined &&
      typeof query === 'object' &&
      'kind' in query &&
      query.kind === 'Document'
    ) {
      this.slice.request = print(query as ASTNode); // ✅ convert AST to SDL string
    } else {
      throw new Error('Invalid GraphQL query format');
    }
    return this;
  }
}

class ReactionSliceBuilderImpl implements FluentReactionSliceBuilder {
  private slice: ReactSlice;

  constructor(name: string) {
    this.slice = {
      type: 'react',
      name,
      server: { gwt: [], data: undefined },
    };
    addSlice(this.slice);
  }

  server(fn: () => void): FluentReactionSliceBuilder;
  server(description: string, fn: () => void): FluentReactionSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentReactionSliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        startServerBlock(slice, description);
        callback();
        endServerBlock();
      }
    }

    return this;
  }

  via(integration: Integration | Integration[]): FluentReactionSliceBuilder {
    const integrations = Array.isArray(integration) ? integration : [integration];
    this.slice.via = integrations.map((i) => i.name);
    return this;
  }

  retries(count: number): FluentReactionSliceBuilder {
    // Store retries in additionalInstructions or metadata
    this.slice.additionalInstructions = `retries: ${count}`;
    return this;
  }
}

export const commandSlice = (name: string): FluentCommandSliceBuilder => new CommandSliceBuilderImpl(name);

export const querySlice = (name: string): FluentQuerySliceBuilder => new QuerySliceBuilderImpl(name);

export const reactSlice = (name: string): FluentReactionSliceBuilder => new ReactionSliceBuilderImpl(name);
