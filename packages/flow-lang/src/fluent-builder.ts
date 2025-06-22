import type { Integration } from './types';

// Base interfaces for the fluent API
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

// Internal state tracking
interface CommandSliceState {
  name: string;
  stream?: string;
  integration?: Integration | Integration[];
  retries?: number;
  client?: {
    description: string;
    fn: () => void;
  };
  server?: {
    description: string;
    fn: () => void;
  };
}

interface QuerySliceState {
  name: string;
  client?: {
    description: string;
    fn: () => void;
    request?: any;
  };
  server?: {
    description: string;
    fn: () => void;
  };
}

interface ReactionSliceState {
  name: string;
  integration?: Integration | Integration[];
  retries?: number;
  server?: {
    description: string;
    fn: () => void;
  };
}

// Implementation
class CommandSliceBuilderImpl implements FluentCommandSliceBuilder {
  private state: CommandSliceState;

  constructor(name: string) {
    this.state = { name };
  }

  stream(name: string): FluentCommandSliceBuilder {
    this.state.stream = name;
    return this;
  }

  client(fn: () => void): FluentCommandSliceBuilder;
  client(description: string, fn: () => void): FluentCommandSliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    if (typeof descriptionOrFn === 'string' && fn) {
      this.state.client = { description: descriptionOrFn, fn };
    } else if (typeof descriptionOrFn === 'function') {
      this.state.client = { description: '', fn: descriptionOrFn };
    }
    return this;
  }

  server(fn: () => void): FluentCommandSliceBuilder;
  server(description: string, fn: () => void): FluentCommandSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentCommandSliceBuilder {
    if (typeof descriptionOrFn === 'string' && fn) {
      this.state.server = { description: descriptionOrFn, fn };
    } else if (typeof descriptionOrFn === 'function') {
      this.state.server = { description: '', fn: descriptionOrFn };
    }
    return this;
  }

  via(integration: Integration | Integration[]): FluentCommandSliceBuilder {
    this.state.integration = integration;
    return this;
  }

  retries(count: number): FluentCommandSliceBuilder {
    this.state.retries = count;
    return this;
  }

}

class QuerySliceBuilderImpl implements FluentQuerySliceBuilder {
  private state: QuerySliceState;

  constructor(name: string) {
    this.state = { name };
  }

  client(fn: () => void): FluentQuerySliceBuilder;
  client(description: string, fn: () => void): FluentQuerySliceBuilder;
  client(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    if (typeof descriptionOrFn === 'string' && fn) {
      this.state.client = { description: descriptionOrFn, fn };
    } else if (typeof descriptionOrFn === 'function') {
      this.state.client = { description: '', fn: descriptionOrFn };
    }
    return this;
  }

  server(fn: () => void): FluentQuerySliceBuilder;
  server(description: string, fn: () => void): FluentQuerySliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentQuerySliceBuilder {
    if (typeof descriptionOrFn === 'string' && fn) {
      this.state.server = { description: descriptionOrFn, fn };
    } else if (typeof descriptionOrFn === 'function') {
      this.state.server = { description: '', fn: descriptionOrFn };
    }
    return this;
  }

  request(query: any): FluentQuerySliceBuilder {
    if (this.state.client) {
      this.state.client.request = query;
    }
    return this;
  }

}

class ReactionSliceBuilderImpl implements FluentReactionSliceBuilder {
  private state: ReactionSliceState;

  constructor(name: string) {
    this.state = { name };
  }

  server(fn: () => void): FluentReactionSliceBuilder;
  server(description: string, fn: () => void): FluentReactionSliceBuilder;
  server(descriptionOrFn: string | (() => void), fn?: () => void): FluentReactionSliceBuilder {
    if (typeof descriptionOrFn === 'string' && fn) {
      this.state.server = { description: descriptionOrFn, fn };
    } else if (typeof descriptionOrFn === 'function') {
      this.state.server = { description: '', fn: descriptionOrFn };
    }
    return this;
  }

  via(integration: Integration | Integration[]): FluentReactionSliceBuilder {
    this.state.integration = integration;
    return this;
  }

  retries(count: number): FluentReactionSliceBuilder {
    this.state.retries = count;
    return this;
  }
}

// Factory functions
export const commandSlice = (name: string): FluentCommandSliceBuilder => {
  return new CommandSliceBuilderImpl(name);
};

export const querySlice = (name: string): FluentQuerySliceBuilder => {
  return new QuerySliceBuilderImpl(name);
};

export const reactSlice = (name: string): FluentReactionSliceBuilder => {
  return new ReactionSliceBuilderImpl(name);
}; 