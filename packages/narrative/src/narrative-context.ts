import createDebug from 'debug';
import type { DataSinkItem, DataSourceItem, DataItem, DataSink, DataSource } from './types';
import type { GivenTypeInfo } from './loader/ts-utils';
import { Narrative, Slice, Example, CommandSlice, QuerySlice, ExperienceSlice } from './index';
import type { ClientSpecNode } from './schema';

function normalizeContext(context?: Partial<Record<string, string>>): Record<string, string> | undefined {
  if (!context) return undefined;

  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

const debug = createDebug('auto:narrative:context:given-types');

interface NarrativeContext {
  narrative: Narrative;
  currentSliceIndex: number | null;
  currentSpecTarget: 'client' | 'server' | null;
  currentSpecIndex: number | null;
  currentRuleIndex: number | null;
  currentExampleIndex: number | null;
  clientSpecStack: ClientSpecNode[];
}

let context: NarrativeContext | null = null;
let givenTypesByFile: Map<string, GivenTypeInfo[]> = new Map();
let whenTypesByFile: Map<string, GivenTypeInfo[]> = new Map();
const givenCallCounters: Map<string, number> = new Map();
const whenCallCounters: Map<string, number> = new Map();

export function setGivenTypesByFile(types: Map<string, GivenTypeInfo[]>): void {
  const whenTypes = types.get('__whenTypes') as Map<string, GivenTypeInfo[]> | undefined;
  if (whenTypes) {
    whenTypesByFile = whenTypes;
    types.delete('__whenTypes');
  }

  givenTypesByFile = types;
  givenCallCounters.clear();
  whenCallCounters.clear();
}

export function startNarrative(name: string, id?: string): Narrative {
  const sourceFile = (globalThis as Record<string, unknown>).__aeCurrentModulePath as string | undefined;
  if (sourceFile !== null && sourceFile !== undefined && sourceFile !== '') {
    givenCallCounters.set(sourceFile, 0);
    whenCallCounters.set(sourceFile, 0);
  }

  const narrative: Narrative = {
    name,
    id,
    slices: [],
    ...(typeof sourceFile === 'string' ? { sourceFile } : {}),
  };
  context = {
    narrative,
    currentSliceIndex: null,
    currentSpecTarget: null,
    currentSpecIndex: null,
    currentRuleIndex: null,
    currentExampleIndex: null,
    clientSpecStack: [],
  };
  return narrative;
}

export function getCurrentNarrative(): Narrative | null {
  return context?.narrative ?? null;
}

export function clearCurrentNarrative(): void {
  context = null;
}

export function getCurrentSlice(): Slice | null {
  if (!context || context.currentSliceIndex === null) return null;
  return context.narrative.slices[context.currentSliceIndex] ?? null;
}

export function addSlice(slice: Slice): void {
  if (!context) throw new Error('No active narrative');
  context.narrative.slices.push(slice);
  context.currentSliceIndex = context.narrative.slices.length - 1;
}

function getServerSpecs(
  slice: Slice,
): { name: string; rules: { id?: string; description: string; examples: Example[] }[] } | undefined {
  if ('server' in slice) {
    return slice.server?.specs;
  }
  return undefined;
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

  const spec = getServerSpecs(slice);
  if (!spec) return undefined;

  const objectRules = spec.rules as { id?: string; description: string; examples: Example[] }[];
  return objectRules[context.currentRuleIndex]?.examples[context.currentExampleIndex];
}

export function startClientBlock(slice: Slice): void {
  if (!context) throw new Error('No active flow context');

  if (slice.type === 'command' || slice.type === 'query' || slice.type === 'experience') {
    slice.client = {
      specs: [],
    };
    context.currentSpecTarget = 'client';
    context.clientSpecStack = [];
  }
}

export function endClientBlock(): void {
  if (context) {
    if (context.clientSpecStack.length > 0) {
      const unclosedCount = context.clientSpecStack.length;
      const unclosedTitles = context.clientSpecStack
        .map((n) => {
          if (n.title !== undefined && n.title !== '') return n.title;
          if (n.id !== undefined && n.id !== '') return n.id;
          return 'unnamed';
        })
        .join(', ');
      throw new Error(`${unclosedCount} unclosed describe block(s): ${unclosedTitles}`);
    }
    context.currentSpecTarget = null;
    context.clientSpecStack = [];
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

  if (context.currentSpecTarget === 'server') {
    initializeServerSpecs(slice, description);
  }
}

export function pushDescribe(id?: string, title?: string): void {
  if (!context) throw new Error('No active narrative context');

  const describeNode: ClientSpecNode = {
    type: 'describe',
    ...(id !== undefined && id !== '' ? { id } : {}),
    ...(title !== undefined && title !== '' ? { title } : {}),
    children: [],
  };

  context.clientSpecStack.push(describeNode);
}

function validateSliceSupportsClientSpecs(slice: Slice): void {
  if (slice.type !== 'command' && slice.type !== 'query' && slice.type !== 'experience') {
    throw new Error('Client specs can only be added to command, query, or experience slices');
  }
}

function addNodeToParentOrRoot(node: ClientSpecNode, slice: CommandSlice | QuerySlice | ExperienceSlice): void {
  if (!context) return;

  if (context.clientSpecStack.length === 0) {
    slice.client.specs.push(node);
  } else {
    const parent = context.clientSpecStack[context.clientSpecStack.length - 1];
    if (parent.type === 'describe') {
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    }
  }
}

export function popDescribe(): void {
  if (!context) throw new Error('No active narrative context');
  if (context.clientSpecStack.length === 0) throw new Error('No active describe block');

  const completedDescribe = context.clientSpecStack.pop();
  if (!completedDescribe) return;

  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  validateSliceSupportsClientSpecs(slice);
  addNodeToParentOrRoot(completedDescribe, slice as CommandSlice | QuerySlice | ExperienceSlice);
}

export function recordIt(id?: string, title: string = ''): void {
  if (!context) throw new Error('No active narrative context');

  const itNode: ClientSpecNode = {
    type: 'it',
    ...(id !== undefined && id !== '' ? { id } : {}),
    title,
  };

  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  validateSliceSupportsClientSpecs(slice);
  addNodeToParentOrRoot(itNode, slice as CommandSlice | QuerySlice | ExperienceSlice);
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

  const spec = getServerSpecs(slice);
  if (!spec) throw new Error('No active specs for current slice');

  const objectRules = spec.rules as { id?: string; description: string; examples: Example[] }[];
  objectRules.push({
    id,
    description,
    examples: [],
  });
  context.currentRuleIndex = objectRules.length - 1;
}

export function recordExample(description: string): void {
  if (!context || context.currentSpecIndex === null || context.currentRuleIndex === null) {
    throw new Error('No active rule context');
  }
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  const spec = getServerSpecs(slice);
  if (!spec) throw new Error('No active specs for current slice');

  const objectRules = spec.rules as { id?: string; description: string; examples: Example[] }[];
  const rule = objectRules[context.currentRuleIndex];
  rule.examples.push({
    description,
    then: [],
  });
  context.currentExampleIndex = rule.examples.length - 1;
}

function processItemWithASTMatch(
  item: unknown,
  matchingType: import('./loader/ts-utils').GivenTypeInfo,
  contextParam?: Record<string, string>,
): { [key: string]: unknown; exampleData: unknown; context?: Record<string, string> } {
  const refType = getRefTypeFromClassification(matchingType.classification);
  return {
    [refType]: matchingType.typeName,
    exampleData: ensureMessageFormat(item).data,
    ...(contextParam && { context: contextParam }),
  };
}

function processGivenItems(
  data: unknown[],
  contextParam?: Record<string, string>,
): Array<{ [key: string]: unknown; exampleData: unknown; context?: Record<string, string> }> {
  const sourceFile = context?.narrative.sourceFile;

  return data.map((item) => {
    if (sourceFile !== null && sourceFile !== undefined && sourceFile !== '') {
      const currentCount = givenCallCounters.get(sourceFile) ?? 0;
      givenCallCounters.set(sourceFile, currentCount + 1);

      // Look up AST-extracted type info by ordinal position
      const givenTypes = givenTypesByFile.get(sourceFile) || [];
      const matchingType = givenTypes[currentCount];

      if (matchingType !== null && matchingType !== undefined) {
        debug('AST match for %s at ordinal %d: %s', sourceFile, currentCount, matchingType.typeName);
        return processItemWithASTMatch(item, matchingType, contextParam);
      } else {
        debug('No AST match for %s at ordinal %d, item: %o', sourceFile, currentCount, item);
      }
    }
    // Fallback: emit explicit InferredType for downstream processing
    return {
      eventRef: 'InferredType',
      exampleData: ensureMessageFormat(item).data,
      ...(contextParam && { context: contextParam }),
    };
  });
}

export function recordGivenData(data: unknown[], contextParam?: Partial<Record<string, string>>): void {
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

  const items = processGivenItems(data, normalizeContext(contextParam));
  example.given = items as typeof example.given;
}

export function recordAndGivenData(data: unknown[], contextParam?: Partial<Record<string, string>>): void {
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

  const items = processGivenItems(data, normalizeContext(contextParam));

  if (example.given && Array.isArray(example.given)) {
    example.given.push(...(items as NonNullable<typeof example.given>));
  } else {
    example.given = items as NonNullable<typeof example.given>;
  }
}

function updateExampleWhen(
  example: Example,
  data: unknown,
  sliceType: string,
  contextParam?: Record<string, string>,
): void {
  const ordinal = incrementWhenCounter();

  if (typeof data === 'object' && data !== null && Object.keys(data).length === 0) {
    if (sliceType === 'query') {
      example.when = { eventRef: '', exampleData: {} };
    } else {
      example.when = { commandRef: '', exampleData: {} };
    }
    return;
  }

  if (sliceType === 'react' || (sliceType === 'query' && Array.isArray(data))) {
    // For react slices and query slices with array input, when is an array of events
    const eventsArray = Array.isArray(data) ? data : [data];
    example.when = eventsArray.map((item) => convertToEventExample(item, contextParam));
  } else {
    example.when = convertToCommandOrEventExample(data, contextParam, ordinal);
  }
}

export function recordWhenData(data: unknown, contextParam?: Partial<Record<string, string>>): void {
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

  updateExampleWhen(example, data, slice.type, normalizeContext(contextParam));
}

export function recordThenData(data: unknown[], contextParam?: Record<string, string>): void {
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

  const outcomes = data.map((item) => convertToOutcomeExample(item, slice.type, normalizeContext(contextParam)));
  example.then = outcomes as typeof example.then;
}

export function recordAndThenData(data: unknown[], contextParam?: Partial<Record<string, string>>): void {
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

  const outcomes = data.map((item) => convertToOutcomeExample(item, slice.type, normalizeContext(contextParam)));
  example.then.push(...(outcomes as typeof example.then));
}

function convertToEventExample(
  item: unknown,
  contextParam?: Record<string, string>,
): { eventRef: string; exampleData: Record<string, unknown>; context?: Record<string, string> } {
  const message = ensureMessageFormat(item);
  return {
    eventRef: message.type,
    exampleData: message.data,
    ...(contextParam && { context: contextParam }),
  };
}

function getRefTypeFromClassification(classification: string): string {
  if (classification === 'event') return 'eventRef';
  if (classification === 'command') return 'commandRef';
  return 'stateRef';
}

function isValidSourceFile(sourceFile: string | null | undefined): sourceFile is string {
  return sourceFile !== null && sourceFile !== undefined && sourceFile !== '';
}

function isValidMatchingType(
  matchingType: import('./loader/ts-utils').GivenTypeInfo | undefined,
): matchingType is import('./loader/ts-utils').GivenTypeInfo {
  return matchingType !== null && matchingType !== undefined && matchingType.typeName !== '';
}

function incrementWhenCounter(): number {
  const sourceFile = context?.narrative.sourceFile;

  if (!isValidSourceFile(sourceFile)) {
    return -1;
  }

  const currentCount = whenCallCounters.get(sourceFile) ?? 0;
  whenCallCounters.set(sourceFile, currentCount + 1);

  debug('[when-counter] incremented counter for %s to %d', sourceFile, currentCount + 1);

  return currentCount;
}

function tryGetWhenTypeFromAST(
  item: unknown,
  ordinal: number,
): { commandRef: string; exampleData: Record<string, unknown> } | null {
  const sourceFile = context?.narrative.sourceFile;

  debug('[when-ast] tryGetWhenTypeFromAST called, sourceFile=%s, ordinal=%d', sourceFile, ordinal);
  debug('[when-ast] whenTypesByFile has %d files', whenTypesByFile.size);
  debug('[when-ast] whenTypesByFile keys: %o', [...whenTypesByFile.keys()]);

  if (!isValidSourceFile(sourceFile)) {
    debug('[when-ast] sourceFile is null/undefined/empty, returning null');
    return null;
  }

  const whenTypes = whenTypesByFile.get(sourceFile) || [];
  debug('[when-ast] sourceFile=%s, ordinal=%d, whenTypes.length=%d', sourceFile, ordinal, whenTypes.length);
  if (whenTypes.length > 0) {
    debug(
      '[when-ast] available types: %o',
      whenTypes.map((t) => ({ typeName: t.typeName, classification: t.classification })),
    );
  }

  const matchingType = whenTypes[ordinal];

  if (!isValidMatchingType(matchingType)) {
    debug('[when-ast] No valid AST match for when at %s ordinal %d, falling back', sourceFile, ordinal);
    return null;
  }

  const refType = getRefTypeFromClassification(matchingType.classification);
  debug(
    '[when-ast] ✅ AST match for when at %s ordinal %d: %s -> %s',
    sourceFile,
    ordinal,
    matchingType.typeName,
    refType,
  );

  return {
    [refType]: matchingType.typeName,
    exampleData: ensureMessageFormat(item).data,
  } as { commandRef: string; exampleData: Record<string, unknown> };
}

function convertToCommandOrEventExample(
  item: unknown,
  contextParam?: Record<string, string>,
  ordinal?: number,
):
  | { commandRef: string; exampleData: Record<string, unknown> }
  | { eventRef: string; exampleData: Record<string, unknown> }[] {
  if (ordinal !== undefined && ordinal >= 0) {
    const astResult = tryGetWhenTypeFromAST(item, ordinal);
    if (astResult) return astResult;
  }

  // Fallback to the original logic
  const message = ensureMessageFormat(item);
  return {
    commandRef: message.type,
    exampleData: message.data,
    ...(contextParam && { context: contextParam }),
  };
}

function convertToOutcomeExample(
  item: unknown,
  sliceType: string,
  contextParam?: Record<string, string>,
):
  | { eventRef: string; exampleData: Record<string, unknown>; context?: Record<string, string> }
  | { stateRef: string; exampleData: Record<string, unknown>; context?: Record<string, string> }
  | { commandRef: string; exampleData: Record<string, unknown>; context?: Record<string, string> }
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
    ...(contextParam && { context: contextParam }),
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
