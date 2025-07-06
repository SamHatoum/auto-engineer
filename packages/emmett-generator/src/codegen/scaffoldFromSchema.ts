import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';
import {ensureDirExists, ensureDirPath, toKebabCase} from './utils/path';
import {camelCase, pascalCase} from 'change-case';
import {CommandExample, EventExample, Flow, SpecsSchema} from '@auto-engineer/flowlang';

const defaultFilesByType: Record<string, string[]> = {
    command: ['commands.ts.ejs', 'events.ts.ejs', 'state.ts.ejs', 'decide.ts.ejs', 'evolve.ts.ejs', 'handle.ts.ejs', 'mutation.resolver.ts.ejs', 'specs.ts.ejs'],
    query: ['resolver.ts.ejs', 'spec.ts.ejs'],
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
}

interface Gwt {
    given?: EventExample[];
    when: CommandExample;
    then: Array<EventExample | { errorType: string; message?: string }>;
}

interface Slice {
    name: string;
    type: 'command' | 'query' | 'react';
    stream?: string;
    server?: {
        gwt?: Gwt[] | Gwt;
    };
}

interface GwtCondition {
    given?: EventExample[];
    when: CommandExample;
    then: Array<EventExample | { errorType: string; message?: string }>;
}

function extractMessagesFromSpecs(
    slice: Slice,
    allMessages: SpecsSchema['messages']
): {
    commands: Message[];
    events: Message[];
    commandSchemasByName: Record<string, Message>;
} {
    const gwtSpecs: Gwt[] = slice.server?.gwt ? (Array.isArray(slice.server.gwt) ? slice.server.gwt : [slice.server.gwt]) : [];

    const commandSchemasByName: Record<string, Message> = {};

    const commands: Message[] = gwtSpecs
        .map((gwt) => gwt.when)
        .filter((when): when is CommandExample => when != null)
        .map((cmd) => {
            const messageDef = allMessages.find((m) => m.type === 'command' && m.name === cmd.commandRef);
            const fields: Field[] =
                messageDef?.fields?.map((f) => ({
                    name: f.name,
                    tsType: f.type,
                    required: f.required ?? true,
                })) ?? [];
            commandSchemasByName[cmd.commandRef] = {
                type: cmd.commandRef,
                fields,
            };
            return {
                type: cmd.commandRef,
                fields,
            };
        });

    const events: Message[] = gwtSpecs
        .flatMap((gwt) => gwt.then ?? [])
        .filter((t): t is EventExample => 'eventRef' in t)
        .map((event) => {
            const messageDef = allMessages.find((m) => m.type === 'event' && m.name === event.eventRef);
            return {
                type: event.eventRef,
                fields:
                    messageDef?.fields?.map((f) => ({
                        name: f.name,
                        tsType: f.type,
                        required: f.required ?? true,
                    })) ?? [],
            };
        });

    return { commands, events, commandSchemasByName };
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
        formatTsValue
    });
}

function resolveStreamId(stream: string, exampleData: Record<string, unknown>): string {
    return stream.replace(/\\$\{([^}]+)\}/g, (_, key: string) => (exampleData?.[key] as string) ?? `unknown`);
}

function mergeGwtConditions(gwts: GwtCondition[]): GwtCondition[] {
    const map = new Map<string, GwtCondition[]>();

    for (const gwt of gwts) {
        const key = JSON.stringify(gwt.when.exampleData);
        const existing = map.get(key) || [];
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

function enrichGwtConditions(conditions: GwtCondition[]): (GwtCondition & { failingFields?: string[] })[] {
    const merged = mergeGwtConditions(conditions);

    const successful = merged.find(gwt =>
        gwt.then.some(t => 'eventRef' in t)
    )?.when.exampleData;

    return merged.map((gwt) => {
        const hasError = gwt.then.some((t) => 'errorType' in t);
        if (!hasError) return gwt;

        const invalidKeys = Object.entries(gwt.when.exampleData)
            .filter(([key, val]) => {
                return val === '' && successful?.[key] !== '';
            })
            .map(([key]) => key);

        return { ...gwt, failingFields: invalidKeys };
    });
}

function buildGwtMapping(slice: Slice): Record<string, (GwtCondition & { failingFields?: string[] })[]> {
    const gwtSpecs: Gwt[] = slice.server?.gwt ? (Array.isArray(slice.server.gwt) ? slice.server.gwt : [slice.server.gwt]) : [];

    const mapping: Record<string, GwtCondition[]> = {};

    for (const gwt of gwtSpecs) {
        const command = gwt.when?.commandRef;
        if (command != null) {
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
        enhancedMapping[command] = enrichGwtConditions(mapping[command]);
    }

    return enhancedMapping;
}

function formatObject(value: Record<string, unknown>): string {
    const entries = Object.entries(value)
        .map(([k, v]) => `${k}: ${formatTsValue(v, 'string')}`);
    return `{ ${entries.join(', ')} }`;
}

function formatArray(value: unknown[], innerType: string): string {
    return `[${value.map((v) => formatTsValue(v, innerType)).join(', ')}]`;
}

function formatPrimitiveValue(value: unknown, tsType: string): string {
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
        return typeof value === 'boolean' ? String(value) : 'false';
    }
    return JSON.stringify(value);
}

function formatTsValue(value: unknown, tsType: string): string {
    if (tsType.endsWith('[]') && Array.isArray(value)) {
        return formatArray(value, tsType.slice(0, -2));
    }
    if (tsType === 'object' && typeof value === 'object' && value !== null) {
        return formatObject(value as Record<string, unknown>);
    }
    return formatPrimitiveValue(value, tsType);
}

function getStreamId(slice: Slice): string | undefined {
    if (slice.type !== 'command') {
        return undefined;
    }
    const streamPattern = slice.stream ?? `${toKebabCase(slice.name)}-\${id}`;
    const gwtSpecs: Gwt[] = slice.server?.gwt != null ? (Array.isArray(slice.server.gwt) ? slice.server.gwt : [slice.server.gwt]) : [];
    const exampleData = gwtSpecs[0]?.when?.exampleData ?? {};
    return resolveStreamId(streamPattern, exampleData);
}

function generateTemplateData(slice: Slice, flow: Flow, messages: SpecsSchema['messages']) {
    const { commands, events, commandSchemasByName } = extractMessagesFromSpecs(slice, messages);
    const gwtMapping = buildGwtMapping(slice);
    const usedErrors = new Set<string>();
    for (const commandName in gwtMapping) {
        for (const gwt of gwtMapping[commandName]) {
            if (gwt.then != null) {
                for (const t of gwt.then) {
                    if ('errorType' in t) usedErrors.add(t.errorType);
                }
            }
        }
    }

    const uniqueCommands = Array.from(
        new Map(commands.map((c) => [c.type, c])).values()
    );

    const streamId = getStreamId(slice);

    return {
        flowName: flow.name,
        sliceName: slice.name,
        slice,
        streamId,
        commands: uniqueCommands,
        events,
        gwtMapping,
        usedErrors: Array.from(usedErrors),
        commandSchemasByName,
    };
}

async function processSlice(
    slice: Slice,
    flow: Flow,
    messages: SpecsSchema['messages'],
    baseDir: string
): Promise<FilePlan[]> {
    const sliceDir = ensureDirPath(ensureDirPath(baseDir, toKebabCase(flow.name)), toKebabCase(slice.name));
    const templates = defaultFilesByType[slice.type];
    if (templates == null) return [];

    const templateData = generateTemplateData(slice, flow, messages);

    const plans: FilePlan[] = [];
    for (const templateFile of templates) {
        const templatePath = path.join(__dirname, './templates', slice.type, templateFile);
        const fileName = templateFile === 'specs.ts.ejs' ? `${camelCase(slice.name)}.specs.ts` : templateFile.replace(/\\.ts\\.ejs$/, '.ts');
        const outputPath = path.join(sliceDir, fileName);

        const contents = await renderTemplate(templatePath, templateData);
        plans.push({ outputPath, contents });
    }
    return plans;
}

export async function generateScaffoldFilePlans(
    flows: Flow[],
    messages: SpecsSchema['messages'],
    baseDir = 'src/domain/flows'
): Promise<FilePlan[]> {
    const allSlicePromises: Promise<FilePlan[]>[] = [];

    for (const flow of flows) {
        if (flow.slices != null) {
            for (const slice of flow.slices) {
                allSlicePromises.push(processSlice(slice as Slice, flow, messages, baseDir));
            }
        }
    }

    const allPlans = await Promise.all(allSlicePromises);
    return allPlans.flat();
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
    messages: SpecsSchema['messages'],
    baseDir = 'src/domain/flows'
): Promise<void> {
    const plans = await generateScaffoldFilePlans(flows, messages, baseDir);
    await writeScaffoldFilePlans(plans);
}