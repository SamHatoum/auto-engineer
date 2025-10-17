import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ejs from 'ejs';
import { ensureDirExists, ensureDirPath, toKebabCase } from './utils/path';
import { camelCase, pascalCase } from 'change-case';
import prettier from 'prettier';
import { Narrative, Slice, Model } from '@auto-engineer/narrative';
import createDebug from 'debug';

const debug = createDebug('auto:server-generator-apollo-emmett:scaffold');
const debugTemplate = createDebug('auto:server-generator-apollo-emmett:scaffold:template');
const debugFiles = createDebug('auto:server-generator-apollo-emmett:scaffold:files');
const debugFlow = createDebug('auto:server-generator-apollo-emmett:scaffold:flow');
const debugSlice = createDebug('auto:server-generator-apollo-emmett:scaffold:slice');
const debugPlan = createDebug('auto:server-generator-apollo-emmett:scaffold:plan');
const debugFormat = createDebug('auto:server-generator-apollo-emmett:scaffold:format');
import {
  buildCommandGwtMapping,
  buildQueryGwtMapping,
  extractMessagesFromSpecs,
  extractProjectionName,
  groupEventImports,
  getAllEventTypes,
  getLocalEvents,
  createEventUnionType,
  isInlineObject as isInlineObjectHelper,
  isInlineObjectArray as isInlineObjectArrayHelper,
  baseTs,
  createIsEnumType,
  createFieldUsesDate,
  createFieldUsesJSON,
  createFieldUsesFloat,
  createCollectEnumNames,
} from './extract';

function extractGwtSpecs(slice: Slice) {
  if (!('server' in slice)) return [];
  const specs = slice.server?.specs;
  const rules = specs?.rules;
  return Array.isArray(rules) && rules.length > 0
    ? rules.flatMap((rule) =>
        rule.examples.map((example) => ({
          given: example.given,
          when: example.when,
          then: example.then,
        })),
      )
    : [];
}
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

interface EnumDefinition {
  name: string;
  values: string[];
  unionString: string;
}

interface EnumContext {
  enums: EnumDefinition[];
  unionToEnumName: Map<string, string>;
}

function isStringLiteralUnion(s: string): boolean {
  return /^"[^"]+"(\s*\|\s*"[^"]+")+$/.test(s.trim()) || /^'[^']+'(\s*\|\s*'[^']+)+$/.test(s.trim());
}

function extractStringLiteralValues(unionString: string): string[] {
  const doubleQuoted = unionString.match(/"([^"]+)"/g);
  const singleQuoted = unionString.match(/'([^']+)'/g);
  const matches = doubleQuoted ?? singleQuoted;
  if (matches === null) return [];
  return matches.map((m) => m.slice(1, -1));
}

function normalizeUnionString(values: string[]): string {
  return values
    .slice()
    .sort()
    .map((v) => `'${v}'`)
    .join(' | ');
}

function generateEnumName(fieldName: string, existingNames: Set<string>): string {
  const baseName = pascalCase(fieldName);
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  let counter = 2;
  while (existingNames.has(`${baseName}${counter}`)) {
    counter++;
  }
  return `${baseName}${counter}`;
}

function processFieldForEnum(
  field: { name: string; type: string },
  messageName: string,
  unionToEnumName: Map<string, string>,
  existingEnumNames: Set<string>,
): EnumDefinition | null {
  const tsType = field.type;
  debug('    Field: %s, type: %O', field.name, tsType);
  if (tsType === null || tsType === undefined) return null;

  const cleanType = tsType.replace(/\s*\|\s*null\b/g, '').trim();
  const isUnion = isStringLiteralUnion(cleanType);
  debug('      cleanType: %O, isStringLiteralUnion: %s', cleanType, isUnion);
  if (!isUnion) return null;

  const values = extractStringLiteralValues(cleanType);
  debug('      extracted values: %O', values);
  if (values.length === 0) return null;

  const normalized = normalizeUnionString(values);

  if (unionToEnumName.has(normalized)) {
    debug('      already has enum for this union, skipping');
    return null;
  }

  const enumName = generateEnumName(`${messageName}${pascalCase(field.name)}`, existingEnumNames);
  existingEnumNames.add(enumName);
  debug('      ✓ Creating enum: %s with values %O', enumName, values);

  const enumDef: EnumDefinition = {
    name: enumName,
    values,
    unionString: normalized,
  };

  unionToEnumName.set(normalized, enumName);
  return enumDef;
}

function extractEnumsFromMessages(messages: MessageDefinition[]): EnumContext {
  const unionToEnumName = new Map<string, string>();
  const enums: EnumDefinition[] = [];
  const existingEnumNames = new Set<string>();

  debug('extractEnumsFromMessages: processing %d messages', messages.length);

  for (const message of messages) {
    debug('  Message: %s, has fields: %s', message.name, message.fields !== undefined && message.fields !== null);
    if (message.fields === undefined || message.fields === null) continue;

    for (const field of message.fields) {
      const enumDef = processFieldForEnum(field, message.name, unionToEnumName, existingEnumNames);
      if (enumDef !== null) {
        enums.push(enumDef);
      }
    }
  }

  debug('extractEnumsFromMessages: found %d enums total', enums.length);
  debug(
    '  Enum names: %O',
    enums.map((e) => e.name),
  );
  debug('  unionToEnumName map size: %d', unionToEnumName.size);
  for (const [union, enumName] of unionToEnumName.entries()) {
    debug('    "%s" -> %s', union, enumName);
  }
  return { enums, unionToEnumName };
}

function generateEnumTypeScript(enumDef: EnumDefinition): string {
  const entries = enumDef.values.map((val) => {
    const key = val.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return `  ${key} = '${val}',`;
  });

  return `export enum ${enumDef.name} {
${entries.join('\n')}
}

registerEnumType(${enumDef.name}, {
  name: '${enumDef.name}',
});`;
}

async function appendEnumsToSharedTypes(baseDir: string, enums: EnumDefinition[]): Promise<void> {
  if (enums.length === 0) return;

  const sharedTypesPath = path.join(baseDir, 'shared', 'types.ts');

  let existingContent = '';
  try {
    existingContent = await fs.readFile(sharedTypesPath, 'utf8');
  } catch {
    debug('Types file does not exist yet at %s, will create it', sharedTypesPath);
  }

  const enumsToAdd = enums.filter((e) => {
    const enumPattern = new RegExp(`export\\s+enum\\s+${e.name}\\s*\\{`, 'm');
    return !enumPattern.test(existingContent);
  });

  if (enumsToAdd.length === 0) {
    debug('All enums already exist in %s, skipping', sharedTypesPath);
    return;
  }

  debug('Adding %d new enums to %s', enumsToAdd.length, sharedTypesPath);

  const hasRegisterEnumImport = existingContent.includes('registerEnumType');
  const enumCode = enumsToAdd.map((e) => generateEnumTypeScript(e)).join('\n\n');

  let newContent: string;
  if (hasRegisterEnumImport) {
    newContent = `${existingContent.trimEnd()}\n\n${enumCode}\n`;
  } else {
    const importMatch = existingContent.match(/^([\s\S]*?)(import.*from\s+['"]type-graphql['"];?\s*\n)/m);
    if (importMatch !== null) {
      const beforeImport = importMatch[1];
      const typeGraphqlImport = importMatch[2];
      const afterImport = existingContent.slice(beforeImport.length + typeGraphqlImport.length);

      const updatedImport = typeGraphqlImport.replace(
        /^import\s*\{([^}]*)\}\s*from\s*['"]type-graphql['"];?\s*$/m,
        (_match: string, imports: string): string => {
          const importsList = imports
            .split(',')
            .map((s) => s.trim())
            .filter((item) => item.length > 0);
          if (!importsList.includes('registerEnumType')) {
            importsList.push('registerEnumType');
          }
          return `import { ${importsList.join(', ')} } from 'type-graphql';`;
        },
      );

      newContent = `${beforeImport}${updatedImport}${afterImport.trimEnd()}\n\n${enumCode}\n`;
    } else {
      newContent = `import { registerEnumType } from 'type-graphql';\n\n${existingContent.trimEnd()}\n\n${enumCode}\n`;
    }
  }

  const prettierConfig = await prettier.resolveConfig(sharedTypesPath);
  const formatted = await prettier.format(newContent, {
    ...prettierConfig,
    parser: 'typescript',
    filepath: sharedTypesPath,
  });

  await fs.mkdir(path.dirname(sharedTypesPath), { recursive: true });
  await fs.writeFile(sharedTypesPath, formatted, 'utf8');
  debug('Appended %d enums to %s', enums.length, sharedTypesPath);
}

export interface FilePlan {
  outputPath: string;
  contents: string;
}

async function renderTemplate(
  templatePath: string,
  data: Record<string, unknown>,
  unionToEnumName: Map<string, string> = new Map(),
): Promise<string> {
  debugTemplate('Rendering template: %s', templatePath);
  debugTemplate('Data keys: %o', Object.keys(data));

  const content = await fs.readFile(templatePath, 'utf8');
  debugTemplate('Template content loaded, size: %d bytes', content.length);
  const template = ejs.compile(content, {
    async: true,
    escape: (text: string): string => text,
  });
  debugTemplate('Template compiled successfully');

  const isInlineObject = isInlineObjectHelper;
  const isInlineObjectArray = isInlineObjectArrayHelper;

  const convertPrimitiveType = (base: string): string => {
    if (base === 'ID') return 'ID';
    if (base === 'Int') return 'Int';
    if (base === 'Float') return 'Float';
    if (base === 'string') return 'String';
    if (base === 'number') return 'Float';
    if (base === 'boolean') return 'Boolean';
    if (base === 'Date') return 'GraphQLISODateTime';
    return 'String';
  };

  const resolveEnumOrString = (base: string): string => {
    if (!isStringLiteralUnion(base)) return 'String';
    const values = extractStringLiteralValues(base);
    const normalized = normalizeUnionString(values);
    const enumName = unionToEnumName.get(normalized);
    return enumName ?? 'String';
  };

  const graphqlType = (rawTs: string): string => {
    const t = (rawTs ?? '').trim();
    if (!t) return 'String';
    const base = t.replace(/\s*\|\s*null\b/g, '').trim();

    const arr1 = base.match(/^Array<(.*)>$/);
    const arr2 = base.match(/^(.*)\[\]$/);
    if (arr1 !== null) return `[${graphqlType(arr1[1].trim())}]`;
    if (arr2 !== null) return `[${graphqlType(arr2[1].trim())}]`;

    if (base === 'unknown' || base === 'any') return 'GraphQLJSON';
    if (base === 'object') return 'JSON';
    if (isInlineObject(base)) return 'JSON';
    if (isStringLiteralUnion(base)) return resolveEnumOrString(base);

    return convertPrimitiveType(base);
  };

  const toTsFieldType = (ts: string): string => {
    if (!ts) return 'string';
    const t = ts.trim();
    const cleanType = t.replace(/\s*\|\s*null\b/g, '').trim();

    const arr = cleanType.match(/^Array<(.*)>$/);
    if (arr !== null) return `${toTsFieldType(arr[1].trim())}[]`;

    if (isStringLiteralUnion(cleanType)) {
      const values = extractStringLiteralValues(cleanType);
      const normalized = normalizeUnionString(values);
      const enumName = unionToEnumName.get(normalized);
      if (enumName !== undefined) return enumName;
    }

    return t;
  };

  const isNullable = (rawTs: string): boolean => /\|\s*null\b/.test(rawTs);

  const isEnumType = createIsEnumType(toTsFieldType);
  const fieldUsesDate = createFieldUsesDate(graphqlType);
  const fieldUsesJSON = createFieldUsesJSON(graphqlType);
  const fieldUsesFloat = createFieldUsesFloat(graphqlType);
  const collectEnumNames = createCollectEnumNames(isEnumType, toTsFieldType);

  const result = await template({
    ...data,
    pascalCase,
    toKebabCase,
    camelCase,
    graphqlType,
    isNullable,
    toTsFieldType,
    formatTsValue,
    formatDataObject,
    messages: data.messages,
    message: data.message,
    isInlineObject,
    isInlineObjectArray,
    baseTs,
    isEnumType,
    fieldUsesDate,
    fieldUsesJSON,
    fieldUsesFloat,
    collectEnumNames,
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
  unionToEnumName: Map<string, string> = new Map(),
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

  const contents = await renderTemplate(templatePath, templateData, unionToEnumName);
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
  flow: Narrative,
  commands: Message[],
  events: Message[],
  states: Message[],
  commandSchemasByName: Record<string, Message>,
  projectionIdField: string | undefined,
  projectionSingleton: boolean | undefined,
  allMessages?: MessageDefinition[],
  integrations?: Model['integrations'],
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

  const allowedForSlice = new Set(Object.keys(gwtMapping));
  const filteredCommands =
    allowedForSlice.size > 0 ? uniqueCommands.filter((c) => allowedForSlice.has(c.type)) : uniqueCommands;

  const eventImportGroups = groupEventImports({ currentSliceName: slice.name, events });
  const allEventTypesArray = getAllEventTypes(events);
  const allEventTypes = createEventUnionType(events);
  const localEvents = getLocalEvents(events);

  return {
    flowName: flow.name,
    sliceName: slice.name,
    slice,
    stream: { pattern: streamPattern, id: streamId },
    commands: filteredCommands,
    events,
    states,
    gwtMapping,
    queryGwtMapping,
    usedErrors,
    commandSchemasByName,
    projectionIdField,
    projectionSingleton,
    projectionName,
    projectionType: projectionName != null ? pascalCase(projectionName) : undefined,
    parsedRequest: slice.type === 'query' && slice.request != null ? parseGraphQlRequest(slice.request) : undefined,
    messages: allMessages,
    message:
      slice.type === 'query' && allMessages
        ? allMessages.find((m) => m.name === slice.server?.data?.[0]?.target?.name)
        : undefined,
    integrations,
    eventImportGroups,
    allEventTypes,
    allEventTypesArray,
    localEvents,
  };
}

function annotateEventSources(
  events: Message[],
  flows: Narrative[],
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

function hasEventInGwtSpecs(gwtSpecs: ReturnType<typeof extractGwtSpecs>, eventType: string): boolean {
  return gwtSpecs.some((g) =>
    g.then.some(
      (t) =>
        typeof t === 'object' && t !== null && 'eventRef' in t && (t as { eventRef: string }).eventRef === eventType,
    ),
  );
}

function canSliceProduceEvent(slice: Slice): boolean {
  return ['command', 'react'].includes(slice.type) && 'server' in slice && Boolean(slice.server?.specs);
}

function findEventSource(flows: Narrative[], eventType: string): { flowName: string; sliceName: string } | null {
  debugSlice('Finding source for event: %s', eventType);

  for (const flow of flows) {
    for (const slice of flow.slices) {
      if (!canSliceProduceEvent(slice)) continue;

      const gwtSpecs = extractGwtSpecs(slice);
      if (hasEventInGwtSpecs(gwtSpecs, eventType)) {
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
  flows: Narrative[],
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

function findCommandSource(flows: Narrative[], commandType: string): { flowName: string; sliceName: string } | null {
  debugSlice('Finding source for command: %s', commandType);
  for (const flow of flows) {
    for (const slice of flow.slices) {
      if (slice.type !== 'command') continue;

      const specs = slice.server?.specs;
      const rules = specs?.rules;
      const gwtSpecs =
        Array.isArray(rules) && rules.length > 0
          ? rules.flatMap((rule) =>
              rule.examples.map((example) => ({
                given: example.given,
                when: example.when,
                then: example.then,
              })),
            )
          : [];
      if (
        gwtSpecs.some(
          (g) =>
            g.when !== undefined &&
            !Array.isArray(g.when) &&
            'commandRef' in g.when &&
            g.when.commandRef === commandType,
        )
      ) {
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
  flow: Narrative,
  sliceDir: string,
  messages: MessageDefinition[],
  flows: Narrative[],
  unionToEnumName: Map<string, string>,
  integrations?: Model['integrations'],
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
  debugSlice(
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
    extracted.projectionSingleton,
    messages,
    integrations,
  );

  debugSlice('  Generating %d files from templates', templates.length);
  const plans = await Promise.all(
    templates.map((template) => generateFileForTemplate(template, slice, sliceDir, templateData, unionToEnumName)),
  );
  debugSlice('  Generated %d file plans for slice: %s', plans.length, slice.name);
  return plans;
}

export async function generateScaffoldFilePlans(
  flows: Narrative[],
  messages: Model['messages'],
  integrations?: Model['integrations'],
  baseDir = 'src/domain/flows',
): Promise<FilePlan[]> {
  debug('Generating scaffold file plans');
  debug('  Number of flows: %d', flows.length);
  debug('  Number of messages: %d', messages?.length ?? 0);
  debug('  Base directory: %s', baseDir);

  const { enums, unionToEnumName } = extractEnumsFromMessages(messages ?? []);
  debug('  Extracted %d enums from messages', enums.length);

  const domainBaseDir = baseDir.replace(/\/flows$/, '');
  await appendEnumsToSharedTypes(domainBaseDir, enums);

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
      const plans = await generateFilesForSlice(
        slice,
        flow,
        sliceDir,
        messages ?? [],
        flows,
        unionToEnumName,
        integrations,
      );
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
  }

  debugPlan('All %d files written successfully', writtenCount);
}

export async function scaffoldFromSchema(
  flows: Narrative[],
  messages: Model['messages'],
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
