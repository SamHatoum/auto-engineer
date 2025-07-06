import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';
import {ensureDirExists, ensureDirPath, toKebabCase} from './utils/path';
import {camelCase, pascalCase} from 'change-case';
import prettier from 'prettier';
import {CommandExample, EventExample, Flow, SpecsSchema, Slice} from '@auto-engineer/flowlang';

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
    // Only process command slices for messages
    if (slice.type !== 'command') {
        return { commands: [], events: [], commandSchemasByName: {} };
    }

    const commandSlice = slice;
    const gwtSpecs = commandSlice.server?.gwt ?? [];

    const commandSchemasByName: Record<string, Message> = {};

    const commands: Message[] = gwtSpecs
        .map((gwt) => gwt.when)
        .filter((cmd): cmd is CommandExample => cmd != null)
        .map((cmd) => {
            const messageDef = allMessages.find((m) => m.type === 'command' && m.name === cmd.commandRef);
            const fields =
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
        .filter((t: unknown): t is EventExample => typeof t === 'object' && t != null && 'eventRef' in t)
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

// eslint-disable-next-line complexity
function buildGwtMapping(slice: Slice): Record<string, (GwtCondition & { failingFields?: string[] })[]> {
    // Only process command slices for GWT mapping
    if (slice.type !== 'command') {
        return {};
    }

    const commandSlice = slice;
    const gwtSpecs = commandSlice.server?.gwt ?? [];

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
        const merged = mergeGwtConditions(mapping[command]);

        const successful = merged.find(gwt =>
            gwt.then.some(t => typeof t === 'object' && t != null && 'eventRef' in t)
        )?.when.exampleData ?? {};

        const enriched = merged.map((gwt) => {
            const hasError = gwt.then.some((t) => typeof t === 'object' && t != null && 'errorType' in t);
            if (!hasError) return gwt;

            const invalidKeys = Object.entries(gwt.when.exampleData)
                .filter(([key, val]) => {
                    return val === '' && successful?.[key] !== '';
                })
                .map(([key]) => key);

            return { ...gwt, failingFields: invalidKeys };
        });

        enhancedMapping[command] = enriched;
    }

    return enhancedMapping;
}

// eslint-disable-next-line complexity
function formatTsValue(value: unknown, tsType: string): string {
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
    if (tsType.endsWith('[]') && Array.isArray(value)) {
        const innerType = tsType.slice(0, -2);
        return `[${value.map((v) => formatTsValue(v, innerType)).join(', ')}]`;
    }
    if (tsType === 'object' && typeof value === 'object' && value != null) {
        const entries = Object.entries(value as Record<string, unknown>)
            .map(([k, v]) => `${k}: ${formatTsValue(v, 'string')}`);
        return `{ ${entries.join(', ')} }`;
    }

    return JSON.stringify(value);
}

// eslint-disable-next-line complexity
export async function generateScaffoldFilePlans(
    flows: Flow[],
    messages: SpecsSchema['messages'],
    baseDir = 'src/domain/flows'
): Promise<FilePlan[]> {
    const plans: FilePlan[] = [];

    for (const flow of flows) {
        const flowDir = ensureDirPath(baseDir, toKebabCase(flow.name));
        for (const slice of flow.slices) {
            const sliceDir = ensureDirPath(flowDir, toKebabCase(slice.name));
            const templates = defaultFilesByType[slice.type];
            if (templates == null) continue;
            const { commands, events, commandSchemasByName } = extractMessagesFromSpecs(slice, messages);
            for (const templateFile of templates) {
                const templatePath = path.join(__dirname, './templates', slice.type, templateFile);
                let fileName: string;
                if (templateFile === 'specs.ts.ejs') {
                    fileName = `${camelCase(slice.name)}.specs.ts`;
                } else {
                    fileName = templateFile.replace(/\.ts\.ejs$/, '.ts');
                }
                const outputPath = path.join(sliceDir, fileName);
                let streamId: string | undefined = undefined;
                if (slice.type === 'command') {
                    const commandSlice = slice as Extract<Slice, { type: 'command' }>;
                    const streamPattern = slice.stream ?? `${toKebabCase(slice.name)}-\${id}`;
                    const gwtSpecs = commandSlice.server?.gwt ?? [];

                    const exampleData = gwtSpecs[0]?.when?.exampleData ?? {};
                    streamId = resolveStreamId(streamPattern, exampleData);
                }
                const gwtMapping = buildGwtMapping(slice);
                const usedErrors = new Set<string>();
                for (const commandName in gwtMapping) {
                    for (const gwt of gwtMapping[commandName]) {
                        for (const t of gwt.then) {
                            if (typeof t === 'object' && t != null && 'errorType' in t) usedErrors.add(t.errorType);
                        }
                    }
                }

                const uniqueCommands = Array.from(
                    new Map(commands.map((c) => [c.type, c])).values()
                );

                const contents = await renderTemplate(templatePath, {
                    flowName: flow.name,
                    sliceName: slice.name,
                    slice,
                    streamId,
                    commands: uniqueCommands,
                    events,
                    gwtMapping,
                    usedErrors: Array.from(usedErrors),
                    commandSchemasByName,
                });
                const prettierConfig = await prettier.resolveConfig(outputPath);
                const formattedContents = await prettier.format(contents, {
                    ...prettierConfig,
                    parser: 'typescript',
                    filepath: outputPath,
                });
                plans.push({outputPath, contents: formattedContents});
            }
        }
    }
    return plans;
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