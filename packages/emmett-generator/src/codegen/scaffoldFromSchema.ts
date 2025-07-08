import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';
import {ensureDirExists, ensureDirPath, toKebabCase} from './utils/path';
import {camelCase, pascalCase} from 'change-case';
import prettier from 'prettier';
import {CommandExample, EventExample, Flow, Slice, SpecsSchemaType} from '@auto-engineer/flowlang';

const defaultFilesByType: Record<string, string[]> = {
    command: ['commands.ts.ejs', 'events.ts.ejs', 'state.ts.ejs', 'decide.ts.ejs', 'evolve.ts.ejs', 'handle.ts.ejs', 'mutation.resolver.ts.ejs', 'specs.ts.ejs'],
    query: ['projection.ts.ejs'],
    react: ['reactor.ts.ejs'],
};

export interface FilePlan {
    outputPath: string;
    contents: string;
}

interface Field {
    name: string;
    tsType: string;
    required: boolean;
}

interface Message {
    type: string;
    fields: Field[];
    source?: 'when' | 'given' | 'then';
}

interface MessageDefinition {
    type: 'command' | 'event' | 'state';
    name: string;
    fields?: Array<{
        name: string;
        type: string;
        required?: boolean;
        description?: string;
        defaultValue?: unknown;
    }>;
    metadata?: unknown;
    description?: string;
}

interface GwtCondition {
    given?: EventExample[];
    when: CommandExample;
    then: Array<EventExample | { errorType: string; message?: string }>;
}

interface QueryGwtCondition {
    given: EventExample[];
    then: Array<{ stateRef: string; exampleData: Record<string, unknown> }>;
}

interface ExtractedMessages {
    commands: Message[];
    events: Message[];
    states: Message[];
    commandSchemasByName: Record<string, Message>;
    projectionIdField?: string;
}

interface HasOrigin {
    origin: unknown;
}

function extractFieldsFromMessage(
    messageName: string,
    messageType: 'command' | 'event' | 'state',
    allMessages: MessageDefinition[]
): Field[] {
    const messageDef = allMessages.find(
        (m) => m.type === messageType && m.name === messageName
    );

    return messageDef?.fields?.map((f) => ({
        name: f.name,
        tsType: f.type,
        required: f.required ?? true,
    })) ?? [];
}

function extractCommandsFromGwt(
    gwtSpecs: Array<{
        given?: EventExample[];
        when: CommandExample;
        then: Array<EventExample | { errorType: string; message?: string }>;
    }>,
    allMessages: MessageDefinition[]
): { commands: Message[]; commandSchemasByName: Record<string, Message> } {
    const commandSchemasByName: Record<string, Message> = {};

    const commands: Message[] = gwtSpecs
        .map((gwt): Message | undefined => {
            const cmd = gwt.when;
            if (!cmd.commandRef) return undefined;

            const fields = extractFieldsFromMessage(cmd.commandRef, 'command', allMessages);

            const command: Message = {
                type: cmd.commandRef,
                fields,
                source: 'when',
            };

            commandSchemasByName[cmd.commandRef] = command;
            return command;
        })
        .filter((cmd): cmd is Message => cmd !== undefined);

    return { commands, commandSchemasByName };
}

function extractEventsFromGiven(
    givenEvents: EventExample[] | undefined,
    allMessages: MessageDefinition[]
): Message[] {
    if (!givenEvents) return [];

    return givenEvents
        .map((given): Message | undefined => {
            if (!given.eventRef) return undefined;

            const fields = extractFieldsFromMessage(given.eventRef, 'event', allMessages);
            return { type: given.eventRef, fields, source: 'given' };
        })
        .filter((event): event is Message => event !== undefined);
}

function extractEventsFromThen(
    thenItems: Array<EventExample | { errorType: string; message?: string }>,
    allMessages: MessageDefinition[]
): Message[] {
    return thenItems
        .map((then): Message | undefined => {
            if (!('eventRef' in then) || !then.eventRef) return undefined;

            const fields = extractFieldsFromMessage(then.eventRef, 'event', allMessages);
            return { type: then.eventRef, fields, source: 'then' };
        })
        .filter((event): event is Message => event !== undefined);
}

function extractMessagesForCommand(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    if (slice.type !== 'command') {
        return { commands: [], events: [], states: [], commandSchemasByName: {} };
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const { commands, commandSchemasByName } = extractCommandsFromGwt(gwtSpecs, allMessages);

    const events: Message[] = gwtSpecs.flatMap((gwt): Message[] => {
        const givenEvents = extractEventsFromGiven(gwt.given, allMessages);
        const thenEvents = extractEventsFromThen(gwt.then, allMessages);
        return [...givenEvents, ...thenEvents];
    });

    const uniqueEventsMap = new Map<string, Message>();
    for (const event of events) {
        if (!uniqueEventsMap.has(event.type)) {
            uniqueEventsMap.set(event.type, event);
        }
    }

    return {
        commands,
        events: Array.from(uniqueEventsMap.values()),
        states: [],
        commandSchemasByName,
    };
}

interface ProjectionOrigin {
    type: 'projection';
    idField?: string;
    name?: string;
}

function isProjectionOrigin(origin: unknown): origin is ProjectionOrigin {
    if (typeof origin !== 'object' || origin === null) {
        return false;
    }

    const obj = origin as Record<string, unknown>;
    return obj.type === 'projection';
}

function extractProjectionIdField(slice: Slice): string | undefined {
    const dataSource = slice.server?.data?.[0];
    if (!hasOrigin(dataSource)) return undefined;

    const origin = dataSource.origin;
    if (isProjectionOrigin(origin)) {
        const idField = origin.idField;
        if (typeof idField === 'string') {
            return idField;
        }
    }

    return undefined;
}

function hasOrigin(dataSource: unknown): dataSource is HasOrigin {
    return typeof dataSource === 'object' && dataSource !== null && 'origin' in dataSource;
}

function extractStatesFromQueryThen(
    thenItems: Array<{ stateRef: string; exampleData: Record<string, unknown> }>,
    allMessages: MessageDefinition[]
): Message[] {
    return thenItems
        .map((then): Message | undefined => {
            if (!then.stateRef) return undefined;

            const fields = extractFieldsFromMessage(then.stateRef, 'state', allMessages);
            return { type: then.stateRef, fields, source: 'then' };
        })
        .filter((state): state is Message => state !== undefined);
}

function extractMessagesForQuery(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    if (slice.type !== 'query') {
        return { commands: [], events: [], states: [], commandSchemasByName: {} };
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const projectionIdField = extractProjectionIdField(slice);

    const events: Message[] = gwtSpecs.flatMap((gwt) =>
        extractEventsFromGiven(gwt.given, allMessages)
    );

    const states: Message[] = gwtSpecs.flatMap((gwt) =>
        extractStatesFromQueryThen(gwt.then, allMessages)
    );

    // Deduplicate events
    const uniqueEventsMap = new Map<string, Message>();
    for (const event of events) {
        if (!uniqueEventsMap.has(event.type)) {
            uniqueEventsMap.set(event.type, event);
        }
    }

    // Deduplicate states
    const uniqueStatesMap = new Map<string, Message>();
    for (const state of states) {
        if (!uniqueStatesMap.has(state.type)) {
            uniqueStatesMap.set(state.type, state);
        }
    }

    return {
        commands: [],
        events: Array.from(uniqueEventsMap.values()),
        states: Array.from(uniqueStatesMap.values()),
        commandSchemasByName: {},
        projectionIdField,
    };
}

function extractMessagesFromSpecs(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    switch (slice.type) {
        case 'command':
            return extractMessagesForCommand(slice, allMessages);
        case 'query':
            return extractMessagesForQuery(slice, allMessages);
        case 'react':
            // TODO: Implement react slice message extraction
            return { commands: [], events: [], states: [], commandSchemasByName: {} };
        default:
            return { commands: [], events: [], states: [], commandSchemasByName: {} };
    }
}

async function renderTemplate(templatePath: string, data: Record<string, unknown>): Promise<string> {
    const content = await fs.readFile(templatePath, 'utf8');
    const template = ejs.compile(content, {async: true});
    const graphqlType = (tsType: string): string => {
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

    return template({
        ...data,
        pascalCase,
        toKebabCase,
        camelCase,
        graphqlType,
        formatTsValue,
        formatDataObject
    });
}

function resolveStreamId(stream: string, exampleData: Record<string, unknown>): string {
    return stream.replace(/\$\{([^}]+)\}/g, (_, key: string) => String(exampleData?.[key] ?? 'unknown'));
}

function mergeGwtConditions(gwts: GwtCondition[]): GwtCondition[] {
    const map = new Map<string, GwtCondition[]>();

    for (const gwt of gwts) {
        const key = JSON.stringify(gwt.when.exampleData);
        const existing = map.get(key) ?? [];
        map.set(key, [...existing, gwt]);
    }

    return Array.from(map.values()).map((conditions) => {
        const first = conditions[0];
        const combinedThen = conditions.flatMap((g) => g.then);
        return {
            given: first.given,
            when: first.when,
            then: combinedThen,
        };
    });
}

function findSuccessfulExampleData(
    gwts: GwtCondition[]
): Record<string, unknown> {
    const successful = gwts.find(gwt =>
        gwt.then.some(t => typeof t === 'object' && t !== null && 'eventRef' in t)
    );
    return successful?.when.exampleData ?? {};
}

function findFailingFields(
    gwt: GwtCondition,
    successfulData: Record<string, unknown>
): string[] {
    const hasError = gwt.then.some((t) =>
        typeof t === 'object' && t !== null && 'errorType' in t
    );

    if (!hasError) return [];

    return Object.entries(gwt.when.exampleData)
        .filter(([key, val]) => {
            const successVal = successfulData[key];
            return val === '' && successVal !== '' && successVal !== undefined;
        })
        .map(([key]) => key);
}

function buildCommandGwtMapping(slice: Slice): Record<string, (GwtCondition & { failingFields?: string[] })[]> {
    if (slice.type !== 'command') {
        return {};
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const mapping: Record<string, GwtCondition[]> = {};

    for (const gwt of gwtSpecs) {
        const command = gwt.when?.commandRef;
        if (command) {
            mapping[command] = mapping[command] ?? [];
            mapping[command].push({
                given: gwt.given,
                when: gwt.when,
                then: gwt.then,
            });
        }
    }

    const enhancedMapping: Record<string, (GwtCondition & { failingFields?: string[] })[]> = {};

    for (const command in mapping) {
        const merged = mergeGwtConditions(mapping[command]);
        const successfulData = findSuccessfulExampleData(merged);

        enhancedMapping[command] = merged.map((gwt) => ({
            ...gwt,
            failingFields: findFailingFields(gwt, successfulData)
        }));
    }

    return enhancedMapping;
}

function buildQueryGwtMapping(slice: Slice): QueryGwtCondition[] {
    if (slice.type !== 'query') {
        return [];
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    return gwtSpecs.map(gwt => ({
        given: gwt.given,
        then: gwt.then
    }));
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
        const entries = Object.entries(value as Record<string, unknown>)
            .map(([k, v]) => `${k}: ${formatTsValue(v, 'string')}`);
        return `{ ${entries.join(', ')} }`;
    }

    return formatTsValueSimple(value, tsType);
}

function formatDataObject(exampleData: Record<string, unknown>, schema: Message | undefined): string {
    const lines = Object.entries(exampleData).map(([key, val]) => {
        const typeDef = schema?.fields?.find((f) => f.name === key);
        const tsType = typeDef?.tsType ?? 'string';
        return `${key}: ${formatTsValue(val, tsType)}`;
    });
    return `{\n  ${lines.join(',\n  ')}\n}`;
}

function extractProjectionName(slice: Slice): string | undefined {
    const dataSource = slice.server?.data?.[0];
    if (!hasOrigin(dataSource)) return undefined;

    const origin = dataSource.origin;
    if (isProjectionOrigin(origin)) {
        const name = origin.name;
        if (typeof name === 'string') {
            return name;
        }
    }

    return undefined;
}

async function generateFileForTemplate(
    templateFile: string,
    slice: Slice,
    sliceDir: string,
    templateData: Record<string, unknown>
): Promise<FilePlan> {
    const templatePath = path.join(__dirname, './templates', slice.type, templateFile);

    let fileName: string;
    if (templateFile === 'specs.ts.ejs') {
        fileName = `${camelCase(slice.name)}.specs.ts`;
    } else {
        fileName = templateFile.replace(/\.ts\.ejs$/, '.ts');
    }

    const outputPath = path.join(sliceDir, fileName);
    const contents = await renderTemplate(templatePath, templateData);

    const prettierConfig = await prettier.resolveConfig(outputPath);
    const formattedContents = await prettier.format(contents, {
        ...prettierConfig,
        parser: 'typescript',
        filepath: outputPath,
    });

    return { outputPath, contents: formattedContents };
}

function extractUsedErrors(gwtMapping: Record<string, (GwtCondition & { failingFields?: string[] })[]>): string[] {
    const usedErrors = new Set<string>();

    for (const commandName in gwtMapping) {
        for (const gwt of gwtMapping[commandName]) {
            for (const t of gwt.then) {
                if (typeof t === 'object' && t !== null && 'errorType' in t && typeof t.errorType === 'string') {
                    usedErrors.add(t.errorType);
                }
            }
        }
    }

    return Array.from(usedErrors);
}

async function prepareTemplateData(
    slice: Slice,
    flow: Flow,
    commands: Message[],
    events: Message[],
    states: Message[],
    commandSchemasByName: Record<string, Message>,
    projectionIdField: string | undefined
): Promise<Record<string, unknown>> {
    let streamId: string | undefined = undefined;

    if (slice.type === 'command') {
        const streamPattern = slice.stream ?? `${toKebabCase(slice.name)}-\${id}`;
        const gwtSpecs = slice.server?.gwt ?? [];
        const exampleData = gwtSpecs[0]?.when?.exampleData ?? {};
        streamId = resolveStreamId(streamPattern, exampleData);
    }

    const gwtMapping = buildCommandGwtMapping(slice);
    const queryGwtMapping = buildQueryGwtMapping(slice);
    const usedErrors = extractUsedErrors(gwtMapping);
    const projectionName = extractProjectionName(slice);

    const uniqueCommands = Array.from(
        new Map(commands.map((c) => [c.type, c])).values()
    );

    return {
        flowName: flow.name,
        sliceName: slice.name,
        slice,
        streamId,
        commands: uniqueCommands,
        events,
        states,
        gwtMapping,
        queryGwtMapping,
        usedErrors,
        commandSchemasByName,
        projectionIdField,
        projectionName,
    };
}

async function generateFilesForSlice(
    slice: Slice,
    flow: Flow,
    sliceDir: string,
    messages: MessageDefinition[]
): Promise<FilePlan[]> {
    const templates = defaultFilesByType[slice.type];
    if (templates === undefined || templates.length === 0) return [];

    const { commands, events, states, commandSchemasByName, projectionIdField } =
        extractMessagesFromSpecs(slice, messages);

    const plans: FilePlan[] = [];
    const templateData = await prepareTemplateData(
        slice,
        flow,
        commands,
        events,
        states,
        commandSchemasByName,
        projectionIdField
    );

    for (const templateFile of templates) {
        const plan = await generateFileForTemplate(templateFile, slice, sliceDir, templateData);
        plans.push(plan);
    }

    console.log('Resolved projection events for', slice.name, ':', events.map(e => e.type));

    return plans;
}

export async function generateScaffoldFilePlans(
    flows: Flow[],
    messages: SpecsSchemaType['messages'],
    baseDir = 'src/domain/flows'
): Promise<FilePlan[]> {
    const allPlans: FilePlan[] = [];

    for (const flow of flows) {
        const flowDir = ensureDirPath(baseDir, toKebabCase(flow.name));

        for (const slice of flow.slices) {
            const sliceDir = ensureDirPath(flowDir, toKebabCase(slice.name));
            const plans = await generateFilesForSlice(slice, flow, sliceDir, messages);
            allPlans.push(...plans);
        }
    }

    return allPlans;
}

export async function writeScaffoldFilePlans(plans: FilePlan[]) {
    for (const {outputPath, contents} of plans) {
        await ensureDirExists(path.dirname(outputPath));
        await fs.writeFile(outputPath, contents, 'utf8');
        console.log(`✅ Created: ${outputPath}`);
    }
}

export async function scaffoldFromSchema(
    flows: Flow[],
    messages: SpecsSchemaType['messages'],
    baseDir = 'src/domain/flows'
): Promise<void> {
    const plans = await generateScaffoldFilePlans(flows, messages, baseDir);
    await writeScaffoldFilePlans(plans);
}