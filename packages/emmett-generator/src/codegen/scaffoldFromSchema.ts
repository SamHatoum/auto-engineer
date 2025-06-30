import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { ensureDirExists, ensureDirPath, toKebabCase } from './utils/path';
import { Flow } from './types';
import { pascalCase } from 'change-case';
import prettier from 'prettier';

Handlebars.registerHelper('pascalCase', (str: string) => {
    if (typeof str !== 'string' || !str.trim()) return '';
    return pascalCase(str);
});
Handlebars.registerHelper('lookup', (obj, field) => obj?.[field]);

const defaultFilesByType: Record<string, string[]> = {
    command: ['commands.ts.hbs', 'events.ts.hbs', 'state.ts.hbs', 'decide.ts.hbs', 'evolve.ts.hbs'],
    query: ['resolver.ts.hbs', 'spec.ts.hbs'],
    react: ['reactor.ts.hbs'],
};

export interface FilePlan {
    outputPath: string;
    contents: string;
}

type Message = {
    type: string;
    fields: { name: string; tsType: string }[];
};

function inferType(value: any): string {
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        return 'Date';
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]';
        const first = value[0];
        const inner = inferType(first);
        return `${inner}[]`;
    }

    switch (typeof value) {
        case 'string':
            return 'string';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'object':
            return 'object';
        default:
            return 'any';
    }
}

function getMessages(slice: any): { commands: Message[]; events: Message[] } {
    const specs = slice.server?.specs ?? [];

    const commands: Message[] = specs
        .map((spec: any) => spec.when)
        .filter(Boolean)
        .map((msg: any) => ({
            type: msg.type,
            fields: Object.entries(msg.data ?? {}).map(([name, val]) => ({
                name,
                tsType: inferType(val),
            })),
        }));

    const events: Message[] = specs
        .flatMap((spec: any) => spec.then ?? [])
        .filter(Boolean)
        .map((msg: any) => ({
            type: msg.type,
            fields: Object.entries(msg.data ?? {}).map(([name, val]) => ({
                name,
                tsType: inferType(val),
            })),
        }));

    return { commands, events };
}

function mergeEventFields(events: Message[]): { name: string; tsType: string; defaultValue: string }[] {
    const fieldMap = new Map<string, { tsType: string; defaultValue: string }>();

    for (const event of events) {
        for (const { name, tsType } of event.fields) {
            if (!fieldMap.has(name)) {
                const coercedType = String(tsType);
                fieldMap.set(name, {
                    tsType: coercedType,
                    defaultValue: guessDefaultValue(coercedType),
                });
            }
        }
    }

    return Array.from(fieldMap.entries()).map(([name, { tsType, defaultValue }]) => ({
        name,
        tsType,
        defaultValue,
    }));
}

function guessDefaultValue(tsType: string): string {
    switch (tsType) {
        case 'string':
            return `''`;
        case 'number':
            return '0';
        case 'boolean':
            return 'false';
        case 'Date':
            return 'new Date()';
        case 'string[]':
        case 'number[]':
        case 'boolean[]':
            return '[]';
        case 'Record<string, any>':
            return '{}';
        case 'any[]':
            return '[]';
        default:
            return '{}';
    }
}

async function renderTemplate(templatePath: string, data: Record<string, any>): Promise<string> {
    const content = await fs.readFile(templatePath, 'utf8');
    const template = Handlebars.compile(content);
    return template(data);
}

export async function generateScaffoldFilePlans(
    flows: Flow[],
    baseDir = 'src/domain/flows'
): Promise<FilePlan[]> {
    const plans: FilePlan[] = [];

    for (const flow of flows) {
        const flowDir = ensureDirPath(baseDir, toKebabCase(flow.name));

        for (const slice of flow.slices) {
            const sliceDir = ensureDirPath(flowDir, toKebabCase(slice.name));
            const templates = defaultFilesByType[slice.type];
            if (!templates) continue;

            const { commands, events } = getMessages(slice);
            const firstCommand = commands[0];
            const firstEvent = events[0];

            for (const templateFile of templates) {
                const templatePath = path.join(__dirname, './templates', slice.type, templateFile);
                const fileName = templateFile.replace(/\.hbs$/, '');
                const outputPath = path.join(sliceDir, fileName);

                const inferredFields = templateFile === 'state.ts.hbs' ? mergeEventFields(events) : [];

                // if (templateFile === 'state.ts.hbs') {
                //     console.log('🧪 inferredFields for state:', inferredFields);
                // }
                // if (templateFile === 'decide.ts.hbs') {
                //     console.log(`🧪 DECIDE TEMPLATE: ${slice.name}`);
                //     console.log('commands:', JSON.stringify(commands, null, 2));
                //     console.log('events:', JSON.stringify(events, null, 2));
                // }

                const contents = await renderTemplate(templatePath, {
                    flowName: flow.name,
                    sliceName: slice.name,
                    stream: slice.stream,
                    commands,
                    events,
                    firstCommand,
                    firstEvent,
                    inferredFields
                });

                //console.log('RAW DECIDE CONTENTS:', contents);

                const prettierConfig = await prettier.resolveConfig(outputPath);
                const formattedContents = await prettier.format(contents, {
                    ...prettierConfig,
                    parser: 'typescript',
                    filepath: outputPath,
                });

                plans.push({ outputPath, contents: formattedContents });
            }
        }
    }

    return plans;
}

export async function writeScaffoldFilePlans(plans: FilePlan[]) {
    for (const { outputPath, contents } of plans) {
        await ensureDirExists(path.dirname(outputPath));
        await fs.writeFile(outputPath, contents, 'utf8');
        console.log(`✅ Created: ${outputPath}`);
    }
}