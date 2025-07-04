import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';
import {ensureDirExists, ensureDirPath, toKebabCase} from './utils/path';
import {camelCase, pascalCase} from 'change-case';
import prettier from 'prettier';
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

type Field = {
    name: string;
    tsType: string;
};

type Message = {
    type: string;
    fields: Field[];
};

type GwtCondition = {
    given?: EventExample[];
    when: CommandExample;
    then: Array<EventExample | { errorType: string; message?: string }>;
};

function extractMessagesFromSpecs(
    slice: any,
    allMessages: SpecsSchema['messages']
): {
    commands: Message[];
    events: Message[];
    commandSchemasByName: Record<string, Message>;
} {
    const gwtSpecs = Array.isArray(slice.server?.gwt)
        ? slice.server.gwt
        : slice.server?.gwt
            ? [slice.server.gwt]
            : [];

    const commandSchemasByName: Record<string, Message> = {};

    const commands: Message[] = gwtSpecs
        .map((gwt: { when: CommandExample }) => gwt.when)
        .filter(Boolean)
        .map((cmd: { commandRef: string }) => {
            const messageDef = allMessages.find((m) => m.type === 'command' && m.name === cmd.commandRef);
            const fields =
                messageDef?.fields?.map((f) => ({
                    name: f.name,
                    tsType: f.type,
                    required: f.required,
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
        .flatMap((gwt: { then: Array<EventExample | { errorType: string }> }) => gwt.then || [])
        .filter((t: any): t is EventExample => 'eventRef' in t)
        .map((event: { eventRef: string }) => {
            const messageDef = allMessages.find((m) => m.type === 'event' && m.name === event.eventRef);
            return {
                type: event.eventRef,
                fields:
                    messageDef?.fields?.map((f) => ({
                        name: f.name,
                        tsType: f.type,
                        required: f.required,
                    })) ?? [],
            };
        });

    return { commands, events, commandSchemasByName };
}

async function renderTemplate(templatePath: string, data: Record<string, any>): Promise<string> {
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
        graphqlType
    });
}

function resolveStreamId(stream: string, exampleData: Record<string, any>): string {
    return stream.replace(/\$\{([^}]+)\}/g, (_, key) => exampleData?.[key] ?? `unknown`);
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

function buildGwtMapping(slice: any): Record<string, (GwtCondition & { failingFields?: string[] })[]> {
    const gwtSpecs = Array.isArray(slice.server?.gwt)
        ? slice.server.gwt
        : slice.server?.gwt
            ? [slice.server.gwt]
            : [];

    const mapping: Record<string, GwtCondition[]> = {};

    for (const gwt of gwtSpecs) {
        const command = gwt.when?.commandRef;
        if (command) {
            mapping[command] = mapping[command] || [];
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
            gwt.then.some(t => 'eventRef' in t)
        )?.when.exampleData ?? {};

        const enriched = merged.map((gwt) => {
            const hasError = gwt.then.some((t) => 'errorType' in t);
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
            if (!templates) continue;
            const { commands, events, commandSchemasByName } = extractMessagesFromSpecs(slice, messages);
            for (const templateFile of templates) {
                const templatePath = path.join(__dirname, './templates', slice.type, templateFile);
                const fileName = templateFile.replace(/\.ts\.ejs$/, '.ts');
                const outputPath = path.join(sliceDir, fileName);
                let streamId: string | undefined = undefined;
                if (slice.type === 'command') {
                    const streamPattern = slice.stream ?? `${toKebabCase(slice.name)}-\${id}`;
                    const gwtSpecs = Array.isArray(slice.server?.gwt)
                        ? slice.server.gwt
                        : slice.server?.gwt
                            ? [slice.server.gwt]
                            : [];

                    const exampleData = gwtSpecs[0]?.when?.exampleData ?? {};
                    streamId = resolveStreamId(streamPattern, exampleData);
                }
                const gwtMapping = buildGwtMapping(slice);
                const usedErrors = new Set<string>();
                for (const commandName in gwtMapping) {
                    for (const gwt of gwtMapping[commandName]) {
                        for (const t of gwt.then) {
                            if ('errorType' in t) usedErrors.add(t.errorType);
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