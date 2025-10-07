import { type Command, defineCommandHandler, type Event } from '@auto-engineer/message-bus';
import * as fs from 'fs/promises';
import * as path from 'path';
import createDebug from 'debug';
import { callAI, getProjectContext, loadScheme } from '../agent';

const debug = createDebug('frontend-implementer:implement-component');

export type ImplementComponentCommand = Command<
  'ImplementComponent',
  {
    projectDir: string;
    iaSchemeDir: string;
    designSystemPath: string;
    componentType: 'atom' | 'molecule' | 'organism' | 'page' | 'app';
    filePath: string;
    componentName: string;
    failures?: string[];
  }
>;

export type ComponentImplementedEvent = Event<
  'ComponentImplemented',
  {
    filePath: string;
    componentType: string;
    componentName: string;
    composition: string[];
    specs: string[];
  }
>;

export type ComponentImplementationFailedEvent = Event<
  'ComponentImplementationFailed',
  {
    error: string;
    componentType: string;
    componentName: string;
    filePath: string;
  }
>;

export const commandHandler = defineCommandHandler<
  ImplementComponentCommand,
  (command: ImplementComponentCommand) => Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent>
>({
  name: 'ImplementComponent',
  alias: 'implement:component',
  description: 'AI implements a single component (atom, molecule, organism, or page)',
  category: 'implement',
  icon: 'layers',
  fields: {
    projectDir: { description: 'Project directory path', required: true },
    iaSchemeDir: { description: 'IA schema directory path', required: true },
    designSystemPath: { description: 'Design system file path', required: true },
    componentType: {
      description: 'Type of component: atom|molecule|organism|page|app',
      required: true,
    },
    filePath: { description: 'Component file path', required: true },
    componentName: { description: 'Name of component to implement', required: true },
    failures: {
      description: 'Any failures from previous implementations',
      required: false,
    },
  },
  examples: [
    '$ auto implement:component --project-dir=./client --ia-scheme-dir=./.context --design-system-path=./design-system.md --component-type=molecule --component-name=SurveyCard',
  ],
  events: ['ComponentImplemented', 'ComponentImplementationFailed'],
  handle: async (
    command: ImplementComponentCommand,
  ): Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent> => {
    const result = await handleImplementComponentCommandInternal(command);
    if (result.type === 'ComponentImplemented') {
      debug(
        'Component implemented: %s/%s at %s',
        result.data.componentType,
        result.data.componentName,
        result.data.filePath,
      );
    } else {
      debug('Failed: %s', result.data.error);
    }
    return result;
  },
});

async function handleImplementComponentCommandInternal(
  command: ImplementComponentCommand,
): Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent> {
  const {
    projectDir,
    iaSchemeDir,
    designSystemPath,
    componentType,
    filePath,
    componentName,
    failures = [],
  } = command.data;

  try {
    const userPreferencesFile = path.resolve(projectDir, 'design-system-principles.md');
    const [userPreferences, designSystem] = await Promise.all([
      fs.readFile(userPreferencesFile, 'utf-8'),
      fs.readFile(designSystemPath, 'utf-8'),
    ]);

    const scheme = await loadScheme(iaSchemeDir);
    if (!scheme) {
      throw new Error('IA scheme not found');
    }

    const pluralKey = `${componentType}s`;
    const collection = (scheme as Record<string, unknown>)[pluralKey];
    if (!isValidCollection(collection)) {
      throw new Error(`Invalid IA schema structure for ${pluralKey}`);
    }

    const items = (collection as { items: Record<string, unknown> }).items;
    const componentDef = items[componentName] as Record<string, unknown> | undefined;
    if (!componentDef) {
      throw new Error(`Component ${componentType}:${componentName} not found in IA schema`);
    }

    const ctx = await getProjectContext(projectDir, iaSchemeDir, userPreferences, designSystem, failures);

    const prompt = makeComponentPrompt(ctx, componentType, componentName, componentDef);

    const code = await callAI(prompt);

    const outPath = path.join(projectDir, 'src/components', `${componentType}s`, `${componentName}.tsx`);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, code, 'utf-8');

    return {
      type: 'ComponentImplemented',
      data: {
        filePath: outPath,
        componentType,
        componentName,
        composition: extractComposition(componentDef),
        specs: extractSpecs(componentDef),
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error: unknown) {
    return {
      type: 'ComponentImplementationFailed',
      data: {
        error: error instanceof Error ? error.message : String(error),
        componentType,
        componentName,
        filePath,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

function extractComposition(componentDef: Record<string, unknown>): string[] {
  if ('composition' in componentDef && Boolean(componentDef.composition)) {
    const comp = componentDef.composition as Record<string, unknown>;
    if ('atoms' in comp && Array.isArray(comp.atoms)) {
      return comp.atoms as string[];
    }
    if ('molecules' in comp && Array.isArray(comp.molecules)) {
      return comp.molecules as string[];
    }
  }
  return [];
}

function extractSpecs(componentDef: Record<string, unknown>): string[] {
  if ('specs' in componentDef && Array.isArray(componentDef.specs)) {
    return componentDef.specs as string[];
  }
  return [];
}

function makeComponentPrompt(
  ctx: {
    fileTreeSummary: string[];
    atoms: unknown;
    graphqlOperations: Record<string, string>;
    theme: string;
  },
  componentType: string,
  componentName: string,
  componentDef: Record<string, unknown>,
): string {
  return `
You are Auto, a masterful frontend engineer.
Implement the following ${componentType}: **${componentName}** from the IA schema.

Component Definition:
${JSON.stringify(componentDef, null, 2)}

Project Snapshot:
${JSON.stringify(ctx.fileTreeSummary, null, 2)}

Available Atoms:
${JSON.stringify(ctx.atoms, null, 2)}

GraphQL Operations:
${Object.keys(ctx.graphqlOperations).join(', ')}

Theme:
${ctx.theme}

Output: ONLY the full TypeScript React component code (no markdown, no explanations).
  `;
}

function isValidCollection(collection: unknown): collection is { items: Record<string, unknown> } {
  if (collection === null || collection === undefined) return false;
  if (typeof collection !== 'object') return false;
  if (!('items' in collection)) return false;

  const items = (collection as { items: unknown }).items;
  return typeof items === 'object' && items !== null;
}

export default commandHandler;
