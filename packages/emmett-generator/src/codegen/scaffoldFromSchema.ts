import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';
import {ensureDirExists, ensureDirPath, toKebabCase} from './utils/path';
import {camelCase, pascalCase} from 'change-case';
import prettier from 'prettier';
import {Flow, Slice, SpecsSchemaType} from '@auto-engineer/flowlang';
import {
    buildCommandGwtMapping, buildQueryGwtMapping, extractMessagesFromSpecs, extractProjectionName,
} from "./extract";
import {Message, MessageDefinition, GwtCondition} from "./types";

const defaultFilesByType: Record<string, string[]> = {
    command: ['commands.ts.ejs', 'events.ts.ejs', 'state.ts.ejs', 'decide.ts.ejs', 'evolve.ts.ejs', 'handle.ts.ejs', 'mutation.resolver.ts.ejs', 'specs.ts.ejs'],
    query: ['projection.ts.ejs', 'state.ts.ejs', 'projection.specs.ts.ejs'],
    react: ['reactor.ts.ejs'],
};

export interface FilePlan {
    outputPath: string;
    contents: string;
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
                if (typeof t === 'object' && t !== null && 'errorType' in t) {
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

function annotateEventSources(
    events: Message[],
    flows: Flow[],
    fallbackFlowName: string,
    fallbackSliceName: string
): void {
    for (const event of events) {
        const match = findEventSource(flows, event.type);
        event.sourceFlowName = match?.flowName ?? fallbackFlowName;
        event.sourceSliceName = match?.sliceName ?? fallbackSliceName;
    }
}

function findEventSource(flows: Flow[], eventType: string): { flowName: string; sliceName: string } | null {
    for (const flow of flows) {
        for (const slice of flow.slices) {
            if (!['command', 'react'].includes(slice.type)) continue;

            const gwt = slice.server?.gwt ?? [];
            if (gwt.some(g => g.then.some(t => 'eventRef' in t && t.eventRef === eventType))) {
                return { flowName: flow.name, sliceName: slice.name };
            }
        }
    }
    return null;
}

async function generateFilesForSlice(
    slice: Slice,
    flow: Flow,
    sliceDir: string,
    messages: MessageDefinition[],
    flows: Flow[]
): Promise<FilePlan[]> {
    const templates = defaultFilesByType[slice.type];
    if (!templates?.length) return [];

    const extracted = extractMessagesFromSpecs(slice, messages);
    annotateEventSources(extracted.events, flows, flow.name, slice.name);

    const templateData = await prepareTemplateData(
        slice,
        flow,
        extracted.commands,
        extracted.events,
        extracted.states,
        extracted.commandSchemasByName,
        extracted.projectionIdField
    );

    return Promise.all(
        templates.map(template =>
            generateFileForTemplate(template, slice, sliceDir, templateData)
        )
    );
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
            const plans = await generateFilesForSlice(slice, flow, sliceDir, messages, flows);
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