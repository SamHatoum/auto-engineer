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
import createDebug from 'debug';

const debug = createDebug('flowlang:fluent-builder');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6';
} // cyan
const debugCommand = createDebug('flowlang:fluent-builder:command');
if ('color' in debugCommand && typeof debugCommand === 'object') {
  (debugCommand as { color: string }).color = '4';
} // blue
const debugQuery = createDebug('flowlang:fluent-builder:query');
if ('color' in debugQuery && typeof debugQuery === 'object') {
  (debugQuery as { color: string }).color = '4';
} // blue
const debugReact = createDebug('flowlang:fluent-builder:react');
if ('color' in debugReact && typeof debugReact === 'object') {
  (debugReact as { color: string }).color = '2';
} // green

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
    debugCommand('Creating command slice: %s', name);
    this.slice = {
      type: 'command',
      name,
      client: { description: '', specs: [] },
      server: { description: '', gwt: [], data: undefined },
    };
    addSlice(this.slice);
    debugCommand('Command slice added to flow: %s', name);
  }

  stream(name: string): FluentCommandSliceBuilder {
    debugCommand('Setting stream for slice %s: %s', this.slice.name, name);
    this.slice.stream = name;
    return this;
  }

  client(fn: () => void): FluentCommandSliceBuilder;
  client(description: string, fn: () => void): FluentCommandSliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    debugCommand('Adding client block to slice %s, description: "%s"', this.slice.name, description);

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        debugCommand('Starting client block execution');
        startClientBlock(slice, description);
        callback();
        endClientBlock();
        debugCommand('Client block execution completed');
      } else {
        debugCommand('WARNING: No current slice found for client block');
      }
    }

    return this;
  }

  server(fn: () => void): FluentCommandSliceBuilder;
  server(description: string, fn: () => void): FluentCommandSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    debugCommand('Adding server block to slice %s, description: "%s"', this.slice.name, description);

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        debugCommand('Starting server block execution');
        startServerBlock(slice, description);
        callback();
        endServerBlock();
        debugCommand('Server block execution completed');
      } else {
        debugCommand('WARNING: No current slice found for server block');
      }
    }

    return this;
  }

  via(integration: Integration | Integration[]): FluentCommandSliceBuilder {
    const integrations = Array.isArray(integration) ? integration : [integration];
    this.slice.via = integrations.map((i) => i.name);
    debugCommand('Set integrations for slice %s: %o', this.slice.name, this.slice.via);
    return this;
  }

  retries(count: number): FluentCommandSliceBuilder {
    debugCommand('Setting retries for slice %s: %d', this.slice.name, count);
    // Store retries in additionalInstructions or metadata
    this.slice.additionalInstructions = `retries: ${count}`;
    return this;
  }

  request(query: unknown): FluentCommandSliceBuilder {
    debugCommand('Setting request for slice %s', this.slice.name);
    if (typeof query === 'string') {
      debugCommand('Request is string, length: %d', query.length);
      this.slice.request = query;
    } else if (
      query !== null &&
      query !== undefined &&
      typeof query === 'object' &&
      'kind' in query &&
      query.kind === 'Document'
    ) {
      debugCommand('Request is GraphQL AST Document, converting to SDL');
      this.slice.request = print(query as ASTNode); // ✅ convert AST to SDL string
      debugCommand('Converted SDL length: %d', this.slice.request.length);
    } else {
      debugCommand('ERROR: Invalid GraphQL query format');
      throw new Error('Invalid GraphQL query format');
    }
    return this;
  }
}

class QuerySliceBuilderImpl implements FluentQuerySliceBuilder {
  private slice: QuerySlice;

  constructor(name: string) {
    debugQuery('Creating query slice: %s', name);
    this.slice = {
      type: 'query',
      name,
      client: { description: '', specs: [] },
      server: { description: '', gwt: [], data: undefined },
    };
    addSlice(this.slice);
    debugQuery('Query slice added to flow: %s', name);
  }

  client(fn: () => void): FluentQuerySliceBuilder;
  client(description: string, fn: () => void): FluentQuerySliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    debugQuery('Adding client block to slice %s, description: "%s"', this.slice.name, description);

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        debugQuery('Starting client block execution');
        startClientBlock(slice, description);
        callback();
        endClientBlock();
        debugQuery('Client block execution completed');
      } else {
        debugQuery('WARNING: No current slice found for client block');
      }
    }

    return this;
  }

  server(fn: () => void): FluentQuerySliceBuilder;
  server(description: string, fn: () => void): FluentQuerySliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    debugQuery('Adding server block to slice %s, description: "%s"', this.slice.name, description);

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        debugQuery('Starting server block execution');
        startServerBlock(slice, description);
        callback();
        endServerBlock();
        debugQuery('Server block execution completed');
      } else {
        debugQuery('WARNING: No current slice found for server block');
      }
    }

    return this;
  }

  request(query: unknown): FluentQuerySliceBuilder {
    debugQuery('Setting request for slice %s', this.slice.name);
    if (typeof query === 'string') {
      debugQuery('Request is string, length: %d', query.length);
      this.slice.request = query;
    } else if (
      query !== null &&
      query !== undefined &&
      typeof query === 'object' &&
      'kind' in query &&
      query.kind === 'Document'
    ) {
      debugQuery('Request is GraphQL AST Document, converting to SDL');
      this.slice.request = print(query as ASTNode); // ✅ convert AST to SDL string
      debugQuery('Converted SDL length: %d', this.slice.request.length);
    } else {
      debugQuery('ERROR: Invalid GraphQL query format');
      throw new Error('Invalid GraphQL query format');
    }
    return this;
  }
}

class ReactionSliceBuilderImpl implements FluentReactionSliceBuilder {
  private slice: ReactSlice;

  constructor(name: string) {
    debugReact('Creating reaction slice: %s', name);
    this.slice = {
      type: 'react',
      name,
      server: { gwt: [], data: undefined },
    };
    addSlice(this.slice);
    debugReact('Reaction slice added to flow: %s', name);
  }

  server(fn: () => void): FluentReactionSliceBuilder;
  server(description: string, fn: () => void): FluentReactionSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentReactionSliceBuilder {
    const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
    const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn;

    debugReact('Adding server block to slice %s, description: "%s"', this.slice.name, description);

    if (callback) {
      const slice = getCurrentSlice();
      if (slice) {
        debugReact('Starting server block execution');
        startServerBlock(slice, description);
        callback();
        endServerBlock();
        debugReact('Server block execution completed');
      } else {
        debugReact('WARNING: No current slice found for server block');
      }
    }

    return this;
  }

  via(integration: Integration | Integration[]): FluentReactionSliceBuilder {
    const integrations = Array.isArray(integration) ? integration : [integration];
    this.slice.via = integrations.map((i) => i.name);
    debugReact('Set integrations for slice %s: %o', this.slice.name, this.slice.via);
    return this;
  }

  retries(count: number): FluentReactionSliceBuilder {
    debugReact('Setting retries for slice %s: %d', this.slice.name, count);
    // Store retries in additionalInstructions or metadata
    this.slice.additionalInstructions = `retries: ${count}`;
    return this;
  }
}

export const commandSlice = (name: string): FluentCommandSliceBuilder => {
  debug('Creating command slice via factory: %s', name);
  return new CommandSliceBuilderImpl(name);
};

export const querySlice = (name: string): FluentQuerySliceBuilder => {
  debug('Creating query slice via factory: %s', name);
  return new QuerySliceBuilderImpl(name);
};

export const reactSlice = (name: string): FluentReactionSliceBuilder => {
  debug('Creating reaction slice via factory: %s', name);
  return new ReactionSliceBuilderImpl(name);
};
