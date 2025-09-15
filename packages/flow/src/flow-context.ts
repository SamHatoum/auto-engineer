import createDebug from 'debug';
import type { DataSinkItem, DataSourceItem, DataItem, DataSink, DataSource } from './types';
import type { GivenTypeInfo } from './loader/ts-utils';
import { Flow, Slice, Example } from './index';

const debug = createDebug('flow:context:given-types');

interface FlowContext {
  flow: Flow;
  currentSliceIndex: number | null;
  currentSpecTarget: 'client' | 'server' | null;
  currentSpecIndex: number | null;
  currentRuleIndex: number | null;
  currentExampleIndex: number | null;
}

let context: FlowContext | null = null;
let givenTypesByFile: Map<string, GivenTypeInfo[]> = new Map();
const givenCallCounters: Map<string, number> = new Map();

export function setGivenTypesByFile(types: Map<string, GivenTypeInfo[]>): void {
  givenTypesByFile = types;
  // Reset counters when AST types are set
  givenCallCounters.clear();
}

export function startFlow(name: string, id?: string): Flow {
  const sourceFile = (globalThis as Record<string, unknown>).__aeCurrentModulePath as string | undefined;
  const flow: Flow = {
    name,
    id,
    slices: [],
    ...(typeof sourceFile === 'string' ? { sourceFile } : {}),
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

function getClientSpecs(slice: Slice): { name: string; rules: string[] } | undefined {
  if (slice.type === 'command' || slice.type === 'query') {
    return slice.client.specs;
  }
  return undefined;
}

function getServerSpecs(
  slice: Slice,
): { name: string; rules: { id?: string; description: string; examples: Example[] }[] } | undefined {
  if ('server' in slice) {
    return slice.server?.specs;
  }
  return undefined;
}

function getCurrentSpecs(
  slice: Slice,
): { name: string; rules: string[] | { id?: string; description: string; examples: Example[] }[] } | undefined {
  if (!context?.currentSpecTarget) return undefined;

  switch (context.currentSpecTarget) {
    case 'client':
      return getClientSpecs(slice);
    case 'server':
      return getServerSpecs(slice);
    default:
      return undefined;
  }
}

function getCurrentExample(slice: Slice): Example | undefined {
  if (
    !context ||
    context.currentSpecIndex === null ||
    context.currentRuleIndex === null ||
    context.currentExampleIndex === null
  ) {
    return undefined;
  }

  const spec = getCurrentSpecs(slice);
  if (!spec) return undefined;

  // Only server specs have object rules with examples
  if (context.currentSpecTarget === 'server') {
    const objectRules = spec.rules as { id?: string; description: string; examples: Example[] }[];
    return objectRules[context.currentRuleIndex]?.examples[context.currentExampleIndex];
  }

  return undefined;
}

export function startClientBlock(slice: Slice, description: string = ''): void {
  if (!context) throw new Error('No active flow context');

  if (slice.type === 'command' || slice.type === 'query') {
    slice.client = {
      description,
      specs: undefined,
    };
    context.currentSpecTarget = 'client';
  } else if (slice.type === 'experience') {
    slice.client = {
      description: description || undefined,
      specs: undefined,
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

function initializeClientSpecs(slice: Slice, description: string): void {
  if (slice.type === 'command' || slice.type === 'query') {
    slice.client.specs = {
      name: description,
      rules: [],
    };
  } else if (slice.type === 'experience') {
    if (slice.client == null) {
      slice.client = { description: '', specs: undefined };
    }
    slice.client.specs = {
      name: description,
      rules: [],
    };
  }
}

function initializeServerSpecs(slice: Slice, description: string): void {
  if ('server' in slice && slice.server != null) {
    slice.server.specs = {
      name: description,
      rules: [],
    };
    if (context) context.currentSpecIndex = 0;
  }
}

export function pushSpec(description: string): void {
  if (!context || !context.currentSpecTarget) throw new Error('No active spec target');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  switch (context.currentSpecTarget) {
    case 'client':
      initializeClientSpecs(slice, description);
      break;
    case 'server':
      initializeServerSpecs(slice, description);
      break;
  }
}

export function recordShouldBlock(description?: string): void {
  if (typeof description === 'string' && context?.currentSpecTarget === 'client') {
    const slice = getCurrentSlice();
    if (slice && (slice.type === 'command' || slice.type === 'query' || slice.type === 'experience')) {
      if (!slice.client.specs) {
        slice.client.specs = {
          name: '',
          rules: [],
        };
      }
      slice.client.specs.rules.push(description);
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

export function recordRule(description: string, id?: string): void {
  if (!context || context.currentSpecIndex === null) throw new Error('No active spec context');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const spec = getCurrentSpecs(slice);
  if (!spec) throw new Error('No active specs for current slice');

  // Only server specs have object rules with examples
  if (context.currentSpecTarget === 'server') {
    const objectRules = spec.rules as { id?: string; description: string; examples: Example[] }[];
    objectRules.push({
      id,
      description,
      examples: [],
    });
    context.currentRuleIndex = objectRules.length - 1;
  }
}

export function recordExample(description: string): void {
  if (!context || context.currentSpecIndex === null || context.currentRuleIndex === null) {
    throw new Error('No active rule context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const spec = getCurrentSpecs(slice);
  if (!spec) throw new Error('No active specs for current slice');

  // Only server specs have object rules with examples
  if (context.currentSpecTarget === 'server') {
    const objectRules = spec.rules as { id?: string; description: string; examples: Example[] }[];
    const rule = objectRules[context.currentRuleIndex];
    rule.examples.push({
      description,
      when: { commandRef: '', exampleData: {} }, // Default, will be updated
      then: [],
    });
    context.currentExampleIndex = rule.examples.length - 1;
  }
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

  const example = getCurrentExample(slice);
  if (!example) throw new Error('No active example for current slice');

  // Get normalized source file path for lookup
  const sourceFile = context.flow.sourceFile;

  const items = data.map((item) => {
    if (sourceFile !== null && sourceFile !== undefined && sourceFile !== '') {
      const currentCount = givenCallCounters.get(sourceFile) ?? 0;
      givenCallCounters.set(sourceFile, currentCount + 1);

      // Look up AST-extracted type info by ordinal position
      const givenTypes = givenTypesByFile.get(sourceFile) || [];
      const matchingType = givenTypes[currentCount]; // Use ordinal index

      if (matchingType !== null && matchingType !== undefined) {
        const refType =
          matchingType.classification === 'event'
            ? 'eventRef'
            : matchingType.classification === 'command'
              ? 'commandRef'
              : 'stateRef';
        debug('AST match for %s at ordinal %d: %s -> %s', sourceFile, currentCount, matchingType.typeName, refType);
        return {
          [refType]: matchingType.typeName,
          exampleData: ensureMessageFormat(item).data,
        };
      } else {
        // Log diagnostic when falling back
        debug('No AST match for %s at ordinal %d, item: %o', sourceFile, currentCount, item);
      }
    }

    // Fallback: emit explicit InferredType for downstream processing
    return {
      eventRef: 'InferredType',
      exampleData: ensureMessageFormat(item).data,
    };
  });

  example.given = items as typeof example.given;
}

function getInferredRefType(): string {
  return 'eventRef';
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

  const example = getCurrentExample(slice);
  if (!example) throw new Error('No active example for current slice');

  const items = data.map((item) => ({
    [getInferredRefType()]: 'InferredType',
    exampleData: ensureMessageFormat(item).data,
  }));

  if (example.given && Array.isArray(example.given)) {
    example.given.push(...(items as NonNullable<typeof example.given>));
  } else {
    example.given = items as NonNullable<typeof example.given>;
  }
}

function updateExampleWhen(example: Example, data: unknown, sliceType: string): void {
  if (sliceType === 'react' || (sliceType === 'query' && Array.isArray(data))) {
    // For react slices and query slices with array input, when is an array of events
    const eventsArray = Array.isArray(data) ? data : [data];
    example.when = eventsArray.map((item) => convertToEventExample(item));
  } else {
    // For command slices, when is a single command
    example.when = convertToCommandOrEventExample(data);
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

  const example = getCurrentExample(slice);
  if (!example) throw new Error('No active example for current slice');

  updateExampleWhen(example, data, slice.type);
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

  const example = getCurrentExample(slice);
  if (!example) throw new Error('No active example for current slice');

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

  const example = getCurrentExample(slice);
  if (!example) throw new Error('No active example for current slice');

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
