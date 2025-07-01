import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';
import { ensureDirExists, ensureDirPath, toKebabCase } from './utils/path';
import { pascalCase } from 'change-case';
import prettier from 'prettier';
import {CommandExample, EventExample, Flow, SpecsSchema} from '@auto-engineer/flowlang';

const defaultFilesByType: Record<string, string[]> = {
    command: ['commands.ts.ejs', 'events.ts.ejs', 'state.ts.ejs', 'decide.ts.ejs', 'evolve.ts.ejs', 'handle.ts.ejs'],
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

function extractMessagesFromSpecs(
    slice: any,
    allMessages: SpecsSchema['messages']
): {
    commands: Message[];
    events: Message[];
} {
    const gwtSpecs = slice.server?.gwt ? [slice.server.gwt] : [];
    const commands: Message[] = gwtSpecs
        .map((gwt: { when: CommandExample }) => gwt.when)
        .filter(Boolean)
        .map((cmd) => {
            const messageDef = allMessages.find((m) => m.type === 'command' && m.name === cmd.commandRef);
            return {
                type: cmd.commandRef,
                fields:
                    messageDef?.fields?.map((f) => ({
                        name: f.name,
                        tsType: f.type,
                        required: f.required,
                    })) ?? [],
            };
        });

    const events: Message[] = gwtSpecs
        .flatMap((gwt: { then: EventExample[] }) => gwt.then || [])
        .filter(Boolean)
        .map((event) => {
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

    return { commands, events };
}

async function renderTemplate(templatePath: string, data: Record<string, any>): Promise<string> {
    const content = await fs.readFile(templatePath, 'utf8');
    const template = ejs.compile(content, { async: true });

    return template({
        ...data,
        pascalCase,
    });
}

function resolveStreamId(stream: string, exampleData: Record<string, any>): string {
    return stream.replace(/\$\{([^}]+)\}/g, (_, key) => exampleData?.[key] ?? `unknown`);
}

function buildGwtMapping(slice: any): Record<string, string[]> {
    const mapping: Record<string, string[]> = {};

    if (slice.server?.gwt) {
        const { when, then } = slice.server.gwt;
        if (when?.commandRef && Array.isArray(then)) {
            mapping[when.commandRef] = then.map((e: EventExample) => e.eventRef);
        }
    }

    return mapping;
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
            const { commands, events } = extractMessagesFromSpecs(slice, messages);
            for (const templateFile of templates) {
                const templatePath = path.join(__dirname, './templates', slice.type, templateFile);
                const fileName = templateFile.replace(/\.ts\.ejs$/, '.ts');
                const outputPath = path.join(sliceDir, fileName);
                let streamId: string | undefined = undefined;
                if (slice.type === 'command') {
                    const streamPattern = slice.stream ?? `${toKebabCase(slice.name)}-\${id}`;
                    const exampleData = slice.server?.gwt?.when?.exampleData ?? {};
                    streamId = resolveStreamId(streamPattern, exampleData);
                }
                const gwtMapping = buildGwtMapping(slice);
                const contents = await renderTemplate(templatePath, {
                    flowName: flow.name,
                    sliceName: slice.name,
                    slice,
                    streamId,
                    commands,
                    events,
                    gwtMapping
                });
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