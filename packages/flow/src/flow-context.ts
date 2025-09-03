import type { DataSinkItem, DataSourceItem, DataItem, DataSink, DataSource } from './types';
import { Flow, Slice } from './index';

interface FlowContext {
  flow: Flow;
  currentSliceIndex: number | null;
  currentSpecTarget: 'client' | 'server' | null;
  currentSpecIndex: number | null;
  currentRuleIndex: number | null;
  currentExampleIndex: number | null;
}

let context: FlowContext | null = null;

export function startFlow(name: string, id?: string): Flow {
  const flow: Flow = {
    name,
    id,
    slices: [],
  };
  context = {
    flow,
    currentSliceIndex: null,
    currentSpecTarget: null,
    currentSpecIndex: null,
    currentRuleIndex: null,
    currentExampleIndex: null,
  };
  return flow;
}

export function getCurrentFlow(): Flow | null {
  return context?.flow ?? null;
}

export function clearCurrentFlow(): void {
  context = null;
}

export function getCurrentSlice(): Slice | null {
  if (!context || context.currentSliceIndex === null) return null;
  return context.flow.slices[context.currentSliceIndex] ?? null;
}

export function addSlice(slice: Slice): void {
  if (!context) throw new Error('No active flow');
  context.flow.slices.push(slice);
  context.currentSliceIndex = context.flow.slices.length - 1;
}

export function startClientBlock(slice: Slice, description: string = ''): void {
  if (!context) throw new Error('No active flow context');

  if (slice.type === 'command' || slice.type === 'query') {
    slice.client = {
      description,
      specs: [],
    };
    context.currentSpecTarget = 'client';
  }
}

export function endClientBlock(): void {
  if (context) {
    context.currentSpecTarget = null;
  }
}

export function startServerBlock(slice: Slice, description: string = ''): void {
  if (!context) throw new Error('No active flow context');

  if (slice.type === 'command') {
    slice.server = {
      description,
      specs: { name: '', rules: [] },
      data: undefined,
    };
  } else if (slice.type === 'query') {
    slice.server = {
      description,
      specs: { name: '', rules: [] },
      data: undefined,
    };
  } else if (slice.type === 'react') {
    slice.server = {
      description: description || undefined,
      specs: { name: '', rules: [] },
      data: undefined,
    };
  }

  context.currentSpecTarget = 'server';
}

export function endServerBlock(): void {
  if (context) {
    context.currentSpecTarget = null;
  }
}

export function pushSpec(description: string): void {
  if (!context || !context.currentSpecTarget) throw new Error('No active spec target');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (context.currentSpecTarget === 'client' && (slice.type === 'command' || slice.type === 'query')) {
    slice.client.specs.push(description);
  } else if (context.currentSpecTarget === 'server') {
    slice.server.specs = {
      name: description,
      rules: [],
    };
    context.currentSpecIndex = 0;
  }
}

export function recordShouldBlock(description?: string): void {
  if (description != null && context?.currentSpecTarget === 'client') {
    const slice = getCurrentSlice();
    if (slice && (slice.type === 'command' || slice.type === 'query')) {
      slice.client.specs.push(description);
    }
  }
}

export function setQueryRequest(request: string): void {
  const slice = getCurrentSlice();
  if (!slice || slice.type !== 'query') throw new Error('Request can only be set on query slices');
  slice.request = request;
}

export function setSliceData(data: DataItem[]): void {
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');
  // Separate sinks and sources
  const sinks = data.filter((item): item is DataSinkItem => item.__type === 'sink');
  const sources = data.filter((item): item is DataSourceItem => item.__type === 'source');

  if (slice.type === 'command') {
    // Command slices only have sinks in their data
    slice.server.data = sinks.length > 0 ? sinks : undefined;
  } else if (slice.type === 'query') {
    // Query slices only have sources in their data
    slice.server.data = sources.length > 0 ? sources : undefined;
  } else if (slice.type === 'react') {
    slice.server.data = data.length > 0 ? stripTypeDiscriminator(data) : undefined;
  }
}

function stripTypeDiscriminator(items: DataItem[]): (DataSink | DataSource)[] {
  return items.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __type, ...rest } = item;
    return rest as DataSink | DataSource;
  });
}

export function recordRule(description: string): void {
  if (!context || context.currentSpecIndex === null) throw new Error('No active spec context');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const spec = slice.server.specs;
  spec.rules.push({
    description,
    examples: [],
  });
  context.currentRuleIndex = spec.rules.length - 1;
}

export function recordExample(description: string): void {
  if (!context || context.currentSpecIndex === null || context.currentRuleIndex === null) {
    throw new Error('No active rule context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const rule = slice.server.specs.rules[context.currentRuleIndex];
  rule.examples.push({
    description,
    when: { commandRef: '', exampleData: {} }, // Default, will be updated
    then: [],
  });
  context.currentExampleIndex = rule.examples.length - 1;
}

export function recordGivenData(data: unknown[]): void {
  if (
    !context ||
    context.currentSpecIndex === null ||
    context.currentRuleIndex === null ||
    context.currentExampleIndex === null
  ) {
    throw new Error('No active example context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const example = slice.server.specs.rules[context.currentRuleIndex].examples[context.currentExampleIndex];
  const events = data.map((item) => convertToEventExample(item));
  example.given = events;
}

export function recordAndGivenData(data: unknown[]): void {
  if (
    !context ||
    context.currentSpecIndex === null ||
    context.currentRuleIndex === null ||
    context.currentExampleIndex === null
  ) {
    throw new Error('No active example context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const example = slice.server.specs.rules[context.currentRuleIndex].examples[context.currentExampleIndex];
  const events = data.map((item) => convertToEventExample(item));
  if (example.given) {
    example.given.push(...events);
  } else {
    example.given = events;
  }
}

export function recordWhenData(data: unknown): void {
  if (
    !context ||
    context.currentSpecIndex === null ||
    context.currentRuleIndex === null ||
    context.currentExampleIndex === null
  ) {
    throw new Error('No active example context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const example = slice.server.specs.rules[context.currentRuleIndex].examples[context.currentExampleIndex];

  if (slice.type === 'react' || (slice.type === 'query' && Array.isArray(data))) {
    // For react slices and query slices with array input, when is an array of events
    const eventsArray = Array.isArray(data) ? data : [data];
    example.when = eventsArray.map((item) => convertToEventExample(item));
  } else {
    // For command slices, when is a single command
    example.when = convertToCommandOrEventExample(data);
  }
}

export function recordThenData(data: unknown[]): void {
  if (
    !context ||
    context.currentSpecIndex === null ||
    context.currentRuleIndex === null ||
    context.currentExampleIndex === null
  ) {
    throw new Error('No active example context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const example = slice.server.specs.rules[context.currentRuleIndex].examples[context.currentExampleIndex];
  const outcomes = data.map((item) => convertToOutcomeExample(item, slice.type));
  example.then = outcomes as typeof example.then;
}

export function recordAndThenData(data: unknown[]): void {
  if (
    !context ||
    context.currentSpecIndex === null ||
    context.currentRuleIndex === null ||
    context.currentExampleIndex === null
  ) {
    throw new Error('No active example context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const example = slice.server.specs.rules[context.currentRuleIndex].examples[context.currentExampleIndex];
  const outcomes = data.map((item) => convertToOutcomeExample(item, slice.type));
  example.then.push(...(outcomes as typeof example.then));
}

function convertToEventExample(item: unknown): { eventRef: string; exampleData: Record<string, unknown> } {
  const message = ensureMessageFormat(item);
  return {
    eventRef: message.type,
    exampleData: message.data,
  };
}

function convertToCommandOrEventExample(
  item: unknown,
):
  | { commandRef: string; exampleData: Record<string, unknown> }
  | { eventRef: string; exampleData: Record<string, unknown> }[] {
  const message = ensureMessageFormat(item);
  return {
    commandRef: message.type,
    exampleData: message.data,
  };
}

function convertToOutcomeExample(
  item: unknown,
  sliceType: string,
):
  | { eventRef: string; exampleData: Record<string, unknown> }
  | { stateRef: string; exampleData: Record<string, unknown> }
  | { commandRef: string; exampleData: Record<string, unknown> }
  | { errorType: 'IllegalStateError' | 'ValidationError' | 'NotFoundError'; message?: string } {
  const message = ensureMessageFormat(item);

  // Check if it's an error
  if (message.type === 'Error' || 'errorType' in message.data) {
    return {
      errorType:
        (message.data.errorType as 'IllegalStateError' | 'ValidationError' | 'NotFoundError') || 'IllegalStateError',
      message: message.data.message as string | undefined,
    };
  }

  if (sliceType === 'command') {
    return {
      eventRef: message.type,
      exampleData: message.data,
    };
  } else if (sliceType === 'query') {
    return {
      stateRef: message.type,
      exampleData: message.data,
    };
  } else if (sliceType === 'react') {
    return {
      commandRef: message.type,
      exampleData: message.data,
    };
  }

  return {
    eventRef: message.type,
    exampleData: message.data,
  };
}

function ensureMessageFormat(item: unknown): { type: string; data: Record<string, unknown> } {
  if (typeof item !== 'object' || item === null) {
    throw new Error('Invalid message format');
  }
  const obj = item as Record<string, unknown>;

  if ('type' in obj && typeof obj.type === 'string') {
    return parseMessageObject(obj);
  }

  // Handle enhanced DSL format - pure data objects without type field
  // The type will be inferred during schema processing from the TypeScript types
  return {
    type: 'InferredType', // Placeholder - will be resolved during schema generation
    data: obj,
  };
}

function parseMessageObject(obj: Record<string, unknown>): { type: string; data: Record<string, unknown> } {
  // Handle direct type/data structure
  if (hasValidDataProperty(obj)) {
    return { type: obj.type as string, data: obj.data as Record<string, unknown> };
  }

  // Handle builder format with __messageCategory
  if ('__messageCategory' in obj) {
    return parseBuilderFormat(obj);
  }

  // Handle legacy format where properties are at top level
  return parseLegacyFormat(obj);
}

function hasValidDataProperty(obj: Record<string, unknown>): boolean {
  return 'data' in obj && typeof obj.data === 'object' && obj.data !== null;
}

function parseBuilderFormat(obj: Record<string, unknown>): { type: string; data: Record<string, unknown> } {
  const data =
    'data' in obj
      ? (obj.data as Record<string, unknown>)
      : Object.fromEntries(Object.entries(obj).filter(([key]) => key !== 'type' && key !== '__messageCategory'));
  return {
    type: obj.type as string,
    data,
  };
}

function parseLegacyFormat(obj: Record<string, unknown>): { type: string; data: Record<string, unknown> } {
  const data = Object.fromEntries(Object.entries(obj).filter(([key]) => key !== 'type'));
  return {
    type: obj.type as string,
    data,
  };
}
