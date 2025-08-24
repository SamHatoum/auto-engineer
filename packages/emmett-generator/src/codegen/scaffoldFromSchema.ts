import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ejs from 'ejs';
import { ensureDirExists, ensureDirPath, toKebabCase } from './utils/path';
import { camelCase, pascalCase } from 'change-case';
import prettier from 'prettier';
import { Flow, Slice, SpecsSchemaType } from '@auto-engineer/flowlang';
import createDebug from 'debug';

const debug = createDebug('emmett:scaffold');
const debugTemplate = createDebug('emmett:scaffold:template');
const debugFiles = createDebug('emmett:scaffold:files');
const debugFlow = createDebug('emmett:scaffold:flow');
const debugSlice = createDebug('emmett:scaffold:slice');
const debugPlan = createDebug('emmett:scaffold:plan');
const debugFormat = createDebug('emmett:scaffold:format');
import {
  buildCommandGwtMapping,
  buildQueryGwtMapping,
  extractMessagesFromSpecs,
  extractProjectionName,
} from './extract';
import { Message, MessageDefinition, GwtCondition } from './types';
import { parseGraphQlRequest } from './extract/graphql';
import { getStreamFromSink } from './extract/data-sink';

const defaultFilesByType: Record<string, string[]> = {
  command: [
    'commands.ts.ejs',
    'events.ts.ejs',
    'state.ts.ejs',
    'decide.ts.ejs',
    'evolve.ts.ejs',
    'handle.ts.ejs',
    'mutation.resolver.ts.ejs',
    'decide.specs.ts.ejs',
    'register.ts.ejs',
  ],
  query: ['projection.ts.ejs', 'state.ts.ejs', 'projection.specs.ts.ejs', 'query.resolver.ts.ejs'],
  react: ['react.ts.ejs', 'react.specs.ts.ejs', 'register.ts.ejs'],
};

export interface FilePlan {
  outputPath: string;
  contents: string;
}

async function renderTemplate(templatePath: string, data: Record<string, unknown>): Promise<string> {
  debugTemplate('Rendering template: %s', templatePath);
  debugTemplate('Data keys: %o', Object.keys(data));

  const content = await fs.readFile(templatePath, 'utf8');
  debugTemplate('Template content loaded, size: %d bytes', content.length);
  const template = ejs.compile(content, {
    async: true,
    escape: (text: string): string => text,
  });
  debugTemplate('Template compiled successfully');

  const graphqlType = (tsType: string): string => {
    debugTemplate('Converting TS type to GraphQL: %s', tsType);
    if (!tsType) return 'String';
    if (tsType === 'ID') return 'ID';
    if (tsType === 'string') return 'String';
    if (tsType === 'number') return 'Number';
    if (tsType === 'boolean') return 'Boolean';
    if (tsType === 'Date') return 'Date';
    if (tsType === 'object') return 'Object';
    if (tsType.endsWith('[]')) {
      const inner = tsType.slice(0, -2);
      return `[${graphqlType(inner)}]`;
    }
    return 'String';
  };

  const result = await template({
    ...data,
    pascalCase,
    toKebabCase,
    camelCase,
    graphqlType,
    formatTsValue,
    formatDataObject,
    messages: data.messages,
    message: data.message,
  });

  debugTemplate('Template rendered, output size: %d bytes', result.length);
  return result;
}

function formatTsValueSimple(value: unknown, tsType: string): string {
  if (tsType === 'Date') {
    return `new Date(${JSON.stringify(value)})`;
  }
  if (tsType === 'string') {
    return JSON.stringify(value);
  }
  if (tsType === 'number') {
    return String(value);
  }
  if (tsType === 'boolean') {
    return value === true ? 'true' : 'false';
  }
  return JSON.stringify(value);
}

function formatTsValue(value: unknown, tsType: string): string {
  if (tsType.endsWith('[]') && Array.isArray(value)) {
    const innerType = tsType.slice(0, -2);
    return `[${value.map((v) => formatTsValue(v, innerType)).join(', ')}]`;
  }

  if (tsType === 'object' && typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `${k}: ${formatTsValue(v, 'string')}`,
    );
    return `{ ${entries.join(', ')} }`;
  }

  return formatTsValueSimple(value, tsType);
}

function formatDataObject(exampleData: Record<string, unknown>, schema: Message | undefined): string {
  debugFormat('Formatting data object with %d fields', Object.keys(exampleData).length);
  const lines = Object.entries(exampleData).map(([key, val]) => {
    const typeDef = schema?.fields?.find((f) => f.name === key);
    const tsType = typeDef?.tsType ?? 'string';
    debugFormat('  Field %s: type=%s, value=%o', key, tsType, val);
    return `${key}: ${formatTsValue(val, tsType)}`;
  });
  return `{
  ${lines.join(',\n  ')}
}`;
}

async function generateFileForTemplate(
  templateFile: string,
  slice: Slice,
  sliceDir: string,
  templateData: Record<string, unknown>,
): Promise<FilePlan> {
  debugFiles('Generating file from template: %s', templateFile);
  debugFiles('  Slice type: %s', slice.type);
  debugFiles('  Slice directory: %s', sliceDir);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const templatePath = path.join(__dirname, './templates', slice.type, templateFile);
  const fileName = templateFile.replace(/\.ts\.ejs$/, '.ts');
  const outputPath = path.join(sliceDir, fileName);

  debugFiles('  Template path: %s', templatePath);
  debugFiles('  Output path: %s', outputPath);

  const contents = await renderTemplate(templatePath, templateData);
  debugFiles('  Rendered content size: %d bytes', contents.length);

  debugFiles('  Formatting with Prettier...');
  const prettierConfig = await prettier.resolveConfig(outputPath);
  const formattedContents = await prettier.format(contents, {
    ...prettierConfig,
    parser: 'typescript',
    filepath: outputPath,
  });
  debugFiles('  Formatted content size: %d bytes', formattedContents.length);

  const plan = { outputPath, contents: formattedContents };
  debugFiles('  File plan created for: %s', fileName);
  return plan;
}

function extractUsedErrors(gwtMapping: Record<string, (GwtCondition & { failingFields?: string[] })[]>): string[] {
  debug('Extracting used errors from GWT mapping');
  const usedErrors = new Set<string>();

  for (const commandName in gwtMapping) {
    debug('  Processing command: %s', commandName);
    for (const gwt of gwtMapping[commandName]) {
      for (const t of gwt.then) {
        if (typeof t === 'object' && t !== null && 'errorType' in t) {
          debug('    Found error type: %s', t.errorType);
          usedErrors.add(t.errorType);
        }
      }
    }
  }

  const errors = Array.from(usedErrors);
  debug('  Total unique errors found: %d', errors.length);
  return errors;
}

async function prepareTemplateData(
  slice: Slice,
  flow: Flow,
  commands: Message[],
  events: Message[],
  states: Message[],
  commandSchemasByName: Record<string, Message>,
  projectionIdField: string | undefined,
  allMessages?: MessageDefinition[],
  integrations?: SpecsSchemaType['integrations'],
): Promise<Record<string, unknown>> {
  debug('Preparing template data for slice: %s (flow: %s)', slice.name, flow.name);
  debug('  Commands: %d', commands.length);
  debug('  Events: %d', events.length);
  debug('  States: %d', states.length);
  debug('  Messages: %d', allMessages?.length ?? 0);
  const { streamPattern, streamId } = getStreamFromSink(slice);
  debug('  Stream pattern: %s, ID: %s', streamPattern, streamId);

  const gwtMapping = buildCommandGwtMapping(slice);
  debug('  GWT mapping built with %d commands', Object.keys(gwtMapping).length);

  const queryGwtMapping = buildQueryGwtMapping(slice);
  debug('  Query GWT mapping built');

  const usedErrors = extractUsedErrors(gwtMapping);
  debug('  Used errors: %o', usedErrors);

  const projectionName = extractProjectionName(slice);
  debug('  Projection name: %s', projectionName ?? 'none');

  const uniqueCommands = Array.from(new Map(commands.map((c) => [c.type, c])).values());
  debug('  Unique commands: %d', uniqueCommands.length);

  return {
    flowName: flow.name,
    sliceName: slice.name,
    slice,
    stream: { pattern: streamPattern, id: streamId },
    commands: uniqueCommands,
    events,
    states,
    gwtMapping,
    queryGwtMapping,
    usedErrors,
    commandSchemasByName,
    projectionIdField,
    projectionName,
    projectionType: projectionName != null ? pascalCase(projectionName) : undefined,
    parsedRequest: slice.type === 'query' && slice.request != null ? parseGraphQlRequest(slice.request) : undefined,
    messages: allMessages,
    message:
      slice.type === 'query' && allMessages
        ? allMessages.find((m) => m.name === slice.server?.data?.[0]?.target?.name)
        : undefined,
    integrations,
  };
}

function annotateEventSources(
  events: Message[],
  flows: Flow[],
  fallbackFlowName: string,
  fallbackSliceName: string,
): void {
  debug('Annotating event sources for %d events', events.length);
  for (const event of events) {
    const match = findEventSource(flows, event.type);
    event.sourceFlowName = match?.flowName ?? fallbackFlowName;
    event.sourceSliceName = match?.sliceName ?? fallbackSliceName;
    debug('  Event %s: flow=%s, slice=%s', event.type, event.sourceFlowName, event.sourceSliceName);
  }
}

function findEventSource(flows: Flow[], eventType: string): { flowName: string; sliceName: string } | null {
  debugSlice('Finding source for event: %s', eventType);
  for (const flow of flows) {
    for (const slice of flow.slices) {
      if (!['command', 'react'].includes(slice.type)) continue;

      const gwt = slice.server?.gwt ?? [];
      if (gwt.some((g) => g.then.some((t) => 'eventRef' in t && t.eventRef === eventType))) {
        debugSlice('  Found event source in flow: %s, slice: %s', flow.name, slice.name);
        return { flowName: flow.name, sliceName: slice.name };
      }
    }
  }
  debugSlice('  No source found for event: %s', eventType);
  return null;
}

function annotateCommandSources(
  commands: Message[],
  flows: Flow[],
  fallbackFlowName: string,
  fallbackSliceName: string,
): void {
  debug('Annotating command sources for %d commands', commands.length);
  for (const command of commands) {
    const match = findCommandSource(flows, command.type);
    command.sourceFlowName = match?.flowName ?? fallbackFlowName;
    command.sourceSliceName = match?.sliceName ?? fallbackSliceName;
    debug('  Command %s: flow=%s, slice=%s', command.type, command.sourceFlowName, command.sourceSliceName);
  }
}

function findCommandSource(flows: Flow[], commandType: string): { flowName: string; sliceName: string } | null {
  debugSlice('Finding source for command: %s', commandType);
  for (const flow of flows) {
    for (const slice of flow.slices) {
      if (slice.type !== 'command') continue;

      const gwt = slice.server?.gwt ?? [];
      if (gwt.some((g) => 'commandRef' in g.when && g.when.commandRef === commandType)) {
        debugSlice('  Found command source in flow: %s, slice: %s', flow.name, slice.name);
        return { flowName: flow.name, sliceName: slice.name };
      }
    }
  }
  debugSlice('  No source found for command: %s', commandType);
  return null;
}

async function generateFilesForSlice(
  slice: Slice,
  flow: Flow,
  sliceDir: string,
  messages: MessageDefinition[],
  flows: Flow[],
  integrations?: SpecsSchemaType['integrations'],
): Promise<FilePlan[]> {
  debugSlice('Generating files for slice: %s (type: %s)', slice.name, slice.type);
  debugSlice('  Flow: %s', flow.name);
  debugSlice('  Output directory: %s', sliceDir);

  const templates = defaultFilesByType[slice.type];
  if (!templates?.length) {
    debugSlice('  No templates found for slice type: %s', slice.type);
    return [];
  }
  debugSlice('  Found %d templates for slice type', templates.length);

  const extracted = extractMessagesFromSpecs(slice, messages);
  debugSlice('  Extracted messages:');
  debugSlice('    Commands: %d', extracted.commands.length);
  debugSlice('    Events: %d', extracted.events.length);
  debugSlice('    States: %d', extracted.states.length);
  console.log(
    '💡 Events for slice',
    slice.name,
    extracted.events.map((e) => e.type),
  );
  annotateEventSources(extracted.events, flows, flow.name, slice.name);
  annotateCommandSources(extracted.commands, flows, flow.name, slice.name);

  const templateData = await prepareTemplateData(
    slice,
    flow,
    extracted.commands,
    extracted.events,
    extracted.states,
    extracted.commandSchemasByName,
    extracted.projectionIdField,
    messages,
    integrations,
  );

  debugSlice('  Generating %d files from templates', templates.length);
  const plans = await Promise.all(
    templates.map((template) => generateFileForTemplate(template, slice, sliceDir, templateData)),
  );
  debugSlice('  Generated %d file plans for slice: %s', plans.length, slice.name);
  return plans;
}

export async function generateScaffoldFilePlans(
  flows: Flow[],
  messages: SpecsSchemaType['messages'],
  integrations?: SpecsSchemaType['integrations'],
  baseDir = 'src/domain/flows',
): Promise<FilePlan[]> {
  debug('Generating scaffold file plans');
  debug('  Number of flows: %d', flows.length);
  debug('  Number of messages: %d', messages?.length ?? 0);
  debug('  Base directory: %s', baseDir);

  const allPlans: FilePlan[] = [];

  for (const flow of flows) {
    debugFlow('Processing flow: %s', flow.name);
    const flowDir = ensureDirPath(baseDir, toKebabCase(flow.name));
    debugFlow('  Flow directory: %s', flowDir);
    debugFlow('  Number of slices: %d', flow.slices.length);

    for (const slice of flow.slices) {
      debugFlow('  Processing slice: %s (type: %s)', slice.name, slice.type);
      const sliceDir = ensureDirPath(flowDir, toKebabCase(slice.name));
      debugFlow('    Slice directory: %s', sliceDir);
      const plans = await generateFilesForSlice(slice, flow, sliceDir, messages, flows, integrations);
      debugFlow('    Generated %d plans for slice', plans.length);
      allPlans.push(...plans);
    }
    debugFlow('  Completed flow: %s', flow.name);
  }

  debug('Total file plans generated: %d', allPlans.length);
  return allPlans;
}

export async function writeScaffoldFilePlans(plans: FilePlan[]) {
  debugPlan('Writing %d scaffold file plans', plans.length);
  let writtenCount = 0;

  for (const { outputPath, contents } of plans) {
    debugPlan('  Writing file: %s', outputPath);
    debugPlan('    Content size: %d bytes', contents.length);

    const dir = path.dirname(outputPath);
    debugPlan('    Ensuring directory exists: %s', dir);
    await ensureDirExists(dir);

    await fs.writeFile(outputPath, contents, 'utf8');
    writtenCount++;
    debugPlan('    File written successfully (%d/%d)', writtenCount, plans.length);
    console.log(`✅ Created: ${outputPath}`);
  }

  debugPlan('All %d files written successfully', writtenCount);
}

export async function scaffoldFromSchema(
  flows: Flow[],
  messages: SpecsSchemaType['messages'],
  baseDir = 'src/domain/flows',
): Promise<void> {
  debug('Starting scaffold from schema');
  debug('  Flows: %d', flows.length);
  debug('  Messages: %d', messages?.length ?? 0);
  debug('  Base directory: %s', baseDir);

  const plans = await generateScaffoldFilePlans(flows, messages, undefined, baseDir);
  debug('Generated %d file plans, writing to disk...', plans.length);

  await writeScaffoldFilePlans(plans);
  debug('Scaffold from schema completed');
}
