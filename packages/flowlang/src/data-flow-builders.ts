import type { DataSinkItem, DataSourceItem, MessageTarget, Integration } from './types';
import { createIntegrationOrigin } from './types';

// Field selector interface for partial object selection
export interface FieldSelector {
  [key: string]: boolean | FieldSelector;
}

// Base builder for message targeting
abstract class MessageTargetBuilder<TResult> {
  protected target: Partial<MessageTarget> = {};
  
  fields(selector: FieldSelector): this {
    this.target.fields = selector as Record<string, unknown>;
    return this;
  }
  
  abstract build(): TResult;
}

// Event sink builder
export class EventSinkBuilder extends MessageTargetBuilder<DataSinkItem> {
  constructor(name: string) {
    super();
    this.target = { type: 'Event', name };
  }
  
  toStream(pattern: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'stream', pattern },
      __type: 'sink' as const
    };
  }
  
  toIntegration(...systems: Integration[]): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'integration', systems: systems.map(s => s.name) },
      __type: 'sink' as const
    };
  }
  
  toDatabase(collection: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'database', collection },
      __type: 'sink' as const
    };
  }
  
  toTopic(name: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'topic', name },
      __type: 'sink' as const
    };
  }
  
  build(): DataSinkItem {
    throw new Error('Must specify a destination using toStream(), toIntegration(), toDatabase(), or toTopic()');
  }
}

// Command sink builder
export class CommandSinkBuilder extends MessageTargetBuilder<DataSinkItem> {
  constructor(name: string) {
    super();
    this.target = { type: 'Command', name };
  }
  
  toIntegration(...systems: (Integration | string)[]): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'integration', systems: systems.map(s => typeof s === 'string' ? s : s.name) },
      __type: 'sink' as const
    };
  }
  
  hints(hint: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'integration', systems: [] },
      transform: hint,
      __type: 'sink' as const
    };
  }
  
  toDatabase(collection: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'database', collection },
      __type: 'sink' as const
    };
  }
  
  toTopic(name: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'topic', name },
      __type: 'sink' as const
    };
  }
  
  build(): DataSinkItem {
    throw new Error('Must specify a destination using toIntegration(), toDatabase(), or toTopic()');
  }
}

// State sink builder
export class StateSinkBuilder extends MessageTargetBuilder<DataSinkItem> {
  constructor(name: string) {
    super();
    this.target = { type: 'State', name };
  }
  
  toDatabase(collection: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'database', collection },
      __type: 'sink' as const
    };
  }
  
  toStream(pattern: string): DataSinkItem {
    return {
      target: this.target as MessageTarget,
      destination: { type: 'stream', pattern },
      __type: 'sink' as const
    };
  }
  
  build(): DataSinkItem {
    throw new Error('Must specify a destination using toDatabase() or toStream()');
  }
}

// State source builder
export class StateSourceBuilder extends MessageTargetBuilder<DataSourceItem> {
  constructor(name: string) {
    super();
    this.target = { type: 'State', name };
  }
  
  fromProjection(name: string): DataSourceItem {
    return {
      target: this.target as MessageTarget,
      origin: { type: 'projection', name },
      __type: 'source' as const
    };
  }
  
  fromReadModel(name: string): DataSourceItem {
    return {
      target: this.target as MessageTarget,
      origin: { type: 'readModel', name },
      __type: 'source' as const
    };
  }
  
  fromDatabase(collection: string, query?: Record<string, unknown>): DataSourceItem {
    return {
      target: this.target as MessageTarget,
      origin: { type: 'database', collection, query },
      __type: 'source' as const
    };
  }
  
  fromApi(endpoint: string, method?: string): DataSourceItem {
    return {
      target: this.target as MessageTarget,
      origin: { type: 'api', endpoint, method },
      __type: 'source' as const
    };
  }
  
  fromIntegration(...systems: (Integration | string)[]): DataSourceItem {
    return {
      target: this.target as MessageTarget,
      origin: createIntegrationOrigin(systems.map(s => typeof s === 'string' ? s : s.name)),
      __type: 'source' as const
    };
  }
  
  build(): DataSourceItem {
    throw new Error('Must specify an origin using fromProjection(), fromReadModel(), fromDatabase(), fromApi(), or fromIntegration()');
  }
}

// Main builder factories
interface BuilderResult {
  type: string;
  __messageCategory: 'event' | 'command' | 'state';
}

function isValidBuilderResult(obj: unknown): obj is BuilderResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    '__messageCategory' in obj &&
    typeof (obj as Record<string, unknown>).type === 'string' &&
    ['event', 'command', 'state'].includes((obj as Record<string, unknown>).__messageCategory as string)
  );
}

export class DataSinkBuilder {
  event(nameOrBuilder: string | BuilderResult): EventSinkBuilder {
    if (typeof nameOrBuilder === 'string') {
      return new EventSinkBuilder(nameOrBuilder);
    }
    
    // Handle event builder function
    if (isValidBuilderResult(nameOrBuilder) && nameOrBuilder.__messageCategory === 'event') {
      return new EventSinkBuilder(nameOrBuilder.type);
    }
    
    throw new Error('Invalid event parameter - must be a string or event builder function');
  }
  
  command(nameOrBuilder: string | BuilderResult): CommandSinkBuilder {
    if (typeof nameOrBuilder === 'string') {
      return new CommandSinkBuilder(nameOrBuilder);
    }
    
    // Handle command builder function
    if (isValidBuilderResult(nameOrBuilder) && nameOrBuilder.__messageCategory === 'command') {
      return new CommandSinkBuilder(nameOrBuilder.type);
    }
    
    throw new Error('Invalid command parameter - must be a string or command builder function');
  }
  
  state(nameOrBuilder: string | BuilderResult): StateSinkBuilder {
    if (typeof nameOrBuilder === 'string') {
      return new StateSinkBuilder(nameOrBuilder);
    }
    
    // Handle state builder function
    if (isValidBuilderResult(nameOrBuilder) && nameOrBuilder.__messageCategory === 'state') {
      return new StateSinkBuilder(nameOrBuilder.type);
    }
    
    throw new Error('Invalid state parameter - must be a string or state builder function');
  }
}

export class DataSourceBuilder {
  state(nameOrBuilder: string | BuilderResult): StateSourceBuilder {
    if (typeof nameOrBuilder === 'string') {
      return new StateSourceBuilder(nameOrBuilder);
    }
    
    // Handle state builder function
    if (isValidBuilderResult(nameOrBuilder) && nameOrBuilder.__messageCategory === 'state') {
      return new StateSourceBuilder(nameOrBuilder.type);
    }
    
    throw new Error('Invalid state parameter - must be a string or state builder function');
  }
}

// Factory functions for cleaner API
export const sink = () => new DataSinkBuilder();
export const source = () => new DataSourceBuilder();


// Type-safe sink function that accepts builder results
export function typedSink(builderResult: BuilderResult): EventSinkBuilder | CommandSinkBuilder | StateSinkBuilder {
  if (!isValidBuilderResult(builderResult)) {
    throw new Error('Invalid builder result - must be from Events, Commands, or State builders');
  }
  
  const { type: messageName, __messageCategory } = builderResult;
  
  switch (__messageCategory) {
    case 'event':
      return new EventSinkBuilder(messageName);
    case 'command':
      return new CommandSinkBuilder(messageName);
    case 'state':
      return new StateSinkBuilder(messageName);
    default: {
      const category: never = __messageCategory;
      throw new Error(`Unknown message category: ${String(category)}`);
    }
  }
}

// Type-safe source function that accepts builder results
export function typedSource(builderResult: BuilderResult): StateSourceBuilder {
  if (!isValidBuilderResult(builderResult)) {
    throw new Error('Invalid builder result - must be from State builders');
  }
  
  if (builderResult.__messageCategory !== 'state') {
    throw new Error('Source can only be created from State builders');
  }
  
  return new StateSourceBuilder(builderResult.type);
}

 