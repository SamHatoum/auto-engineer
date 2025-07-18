import type { DataSinkItem, DataSourceItem, MessageTarget, Integration } from './types';
import { createIntegrationOrigin } from './types';

// Extended interfaces that add chainable methods
export interface ChainableSinkMethods {
  additionalInstructions(instructions: string): ChainableSink;
  withState(source: DataSourceItem | ChainableSource): ChainableSink;
}

export interface ChainableSourceMethods {
  additionalInstructions(instructions: string): ChainableSource;
}

export type ChainableSink = DataSinkItem & ChainableSinkMethods;
export type ChainableSource = DataSourceItem & ChainableSourceMethods;

// Helper functions to create chainable items
function createChainableSink(sinkItem: DataSinkItem): ChainableSink {
  const chainable = sinkItem as ChainableSink;
  
  (chainable as ChainableSinkMethods).additionalInstructions = function(instructions: string): ChainableSink {
    return createChainableSink({
      ...sinkItem,
      _additionalInstructions: instructions,
    });
  };
  
  (chainable as ChainableSinkMethods).withState = function(source: DataSourceItem | ChainableSource): ChainableSink {
    return createChainableSink({
      ...sinkItem,
      _withState: source,
    });
  };
  
  return chainable;
}

function createChainableSource(sourceItem: DataSourceItem): ChainableSource {
  const chainable = sourceItem as ChainableSource;
  
  (chainable as ChainableSourceMethods).additionalInstructions = function(instructions: string): ChainableSource {
    return createChainableSource({
      ...sourceItem,
      _additionalInstructions: instructions,
    });
  };
  
  return chainable;
}

// Field selector interface for partial object selection
export interface FieldSelector {
  [key: string]: boolean | FieldSelector;
}

// Base builder for message targeting
abstract class MessageTargetBuilder<TResult> {
  protected target: Partial<MessageTarget> = {};
  protected instructions?: string;

  fields(selector: FieldSelector): this {
    this.target.fields = selector as Record<string, unknown>;
    return this;
  }

  additionalInstructions(instructions: string): this {
    this.instructions = instructions;
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

  toStream(pattern: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'stream', pattern },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSink(sinkItem);
  }

  toIntegration(...systems: Integration[]): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'integration', systems: systems.map((s) => s.name) },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSink(sinkItem);
  }

  toDatabase(collection: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'database', collection },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSink(sinkItem);
  }

  toTopic(name: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'topic', name },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSink(sinkItem);
  }

  build(): DataSinkItem {
    throw new Error('Must specify a destination using toStream(), toIntegration(), toDatabase(), or toTopic()');
  }
}

// Command sink builder
export class CommandSinkBuilder extends MessageTargetBuilder<DataSinkItem> {
  private stateSource?: DataSourceItem;

  constructor(name: string) {
    super();
    this.target = { type: 'Command', name };
  }

  withState(source: DataSourceItem | ChainableSource): this {
    this.stateSource = source;
    return this;
  }

  toIntegration(...systems: (Integration | string)[]): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'integration', systems: systems.map((s) => (typeof s === 'string' ? s : s.name)) },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
      ...(this.stateSource != null && { _withState: this.stateSource }),
    };
    return createChainableSink(sinkItem);
  }

  hints(hint: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'integration', systems: [] },
      transform: hint,
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
      ...(this.stateSource != null && { _withState: this.stateSource }),
    };
    return createChainableSink(sinkItem);
  }

  toDatabase(collection: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'database', collection },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
      ...(this.stateSource != null && { _withState: this.stateSource }),
    };
    return createChainableSink(sinkItem);
  }

  toTopic(name: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'topic', name },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
      ...(this.stateSource != null && { _withState: this.stateSource }),
    };
    return createChainableSink(sinkItem);
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

  toDatabase(collection: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'database', collection },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSink(sinkItem);
  }

  toStream(pattern: string): ChainableSink {
    const sinkItem: DataSinkItem = {
      target: this.target as MessageTarget,
      destination: { type: 'stream', pattern },
      __type: 'sink' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSink(sinkItem);
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

  fromProjection(name: string, idField?: string): ChainableSource {
    const sourceItem: DataSourceItem = {
      target: this.target as MessageTarget,
      origin: { type: 'projection', name, ...(idField != null && idField !== '' && { idField }) },
      __type: 'source' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSource(sourceItem);
  }

  fromReadModel(name: string): ChainableSource {
    const sourceItem: DataSourceItem = {
      target: this.target as MessageTarget,
      origin: { type: 'readModel', name },
      __type: 'source' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSource(sourceItem);
  }

  fromDatabase(collection: string, query?: Record<string, unknown>): ChainableSource {
    const sourceItem: DataSourceItem = {
      target: this.target as MessageTarget,
      origin: { type: 'database', collection, query },
      __type: 'source' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSource(sourceItem);
  }

  fromApi(endpoint: string, method?: string): ChainableSource {
    const sourceItem: DataSourceItem = {
      target: this.target as MessageTarget,
      origin: { type: 'api', endpoint, method },
      __type: 'source' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSource(sourceItem);
  }

  fromIntegration(...systems: (Integration | string)[]): ChainableSource {
    const sourceItem: DataSourceItem = {
      target: this.target as MessageTarget,
      origin: createIntegrationOrigin(systems.map((s) => (typeof s === 'string' ? s : s.name))),
      __type: 'source' as const,
      ...(this.instructions != null && this.instructions !== '' && { _additionalInstructions: this.instructions }),
    };
    return createChainableSource(sourceItem);
  }

  build(): DataSourceItem {
    throw new Error(
      'Must specify an origin using fromProjection(), fromReadModel(), fromDatabase(), fromApi(), or fromIntegration()',
    );
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
