// noinspection ExceptionCaughtLocallyJS

import { type Command, defineCommandHandler, type Event } from '@auto-engineer/message-bus';
import * as fs from 'fs/promises';
import * as path from 'path';
import createDebug from 'debug';
import { callAI, loadScheme } from '../agent';
import { execa } from 'execa';
import { performance } from 'perf_hooks';

const debug = createDebug('frontend-implementer:implement-component');
const debugTypeCheck = createDebug('frontend-implementer:implement-component:typecheck');

export type ImplementComponentCommand = Command<
  'ImplementComponent',
  {
    projectDir: string;
    iaSchemeDir: string;
    designSystemPath: string;
    componentType: 'atom' | 'molecule' | 'organism' | 'page';
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
    failures: { description: 'Any failures from previous implementations', required: false },
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
      debug('Component implemented successfully: %s/%s', result.data.componentType, result.data.componentName);
    } else {
      debug('Component implementation failed: %s', result.data.error);
    }
    return result;
  },
});

async function handleImplementComponentCommandInternal(
  command: ImplementComponentCommand,
): Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent> {
  const { projectDir, iaSchemeDir, designSystemPath, componentType, componentName, filePath } = command.data;

  try {
    const start = performance.now();
    debug(`Starting ${componentType}:${componentName}`);

    const t1 = performance.now();
    const scheme = await loadScheme(iaSchemeDir);
    debug(`[1] Loaded IA scheme in ${(performance.now() - t1).toFixed(2)} ms`);
    if (!scheme) throw new Error('IA scheme not found');

    const pluralKey = `${componentType}s`;
    const collection = (scheme as Record<string, unknown>)[pluralKey];
    if (!isValidCollection(collection)) throw new Error(`Invalid IA schema structure for ${pluralKey}`);

    const items = (collection as { items: Record<string, unknown> }).items;
    const componentDef = items[componentName] as Record<string, unknown> | undefined;
    if (!componentDef) throw new Error(`Component ${componentType}:${componentName} not found in IA schema`);

    const outPath = path.join(projectDir, '..', filePath);

    const t2 = performance.now();
    let existingScaffold = '';
    try {
      existingScaffold = await fs.readFile(outPath, 'utf-8');
      debug(`[2] Found existing scaffold in ${(performance.now() - t2).toFixed(2)} ms`);
    } catch {
      debug(`[2] No existing scaffold found (${(performance.now() - t2).toFixed(2)} ms)`);
    }

    const t3 = performance.now();
    const projectConfig = await readAllTopLevelFiles(projectDir);
    debug(`[3] Loaded project + gql/graphql files in ${(performance.now() - t3).toFixed(2)} ms`);

    const t4 = performance.now();
    const designSystemReference = await readDesignSystem(designSystemPath, { projectDir, iaSchemeDir });
    debug(`[4] Loaded design system reference in ${(performance.now() - t4).toFixed(2)} ms`);

    const t5 = performance.now();
    const prompt = makeComponentPrompt(
      componentType,
      componentName,
      componentDef,
      existingScaffold,
      projectConfig,
      designSystemReference,
    );
    debug(`[5] Prepared AI prompt in ${(performance.now() - t5).toFixed(2)} ms`);

    const t6 = performance.now();
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    let code = sanitizeCodeOutput(await callAI(prompt));
    debug('Generated code preview:\n%s', code.substring(0, 400));
    await fs.writeFile(outPath, code, 'utf-8');
    debug(`[6] AI generated component in ${(performance.now() - t6).toFixed(2)} ms`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const checkStart = performance.now();
      const { success, errors } = await runTypeCheckForFile(projectDir, outPath);
      debugTypeCheck(
        `[7.${attempt}] Type check attempt ${attempt} completed in ${(performance.now() - checkStart).toFixed(
          2,
        )} ms (success: ${success})`,
      );

      if (success) {
        debug(`[✓] Implementation succeeded in ${(performance.now() - start).toFixed(2)} ms total`);
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
      }

      if (attempt < 3) {
        const fixStart = performance.now();
        const fixPrompt = `
You previously generated this ${componentType}: **${componentName}**.
TypeScript errors occurred in "${componentName}.tsx".
Fix ONLY these errors without changing logic or structure.

Errors:
${errors}

Current code:
${code}

Return the corrected TypeScript file only.
        `;
        code = sanitizeCodeOutput(await callAI(fixPrompt));
        await fs.writeFile(outPath, code, 'utf-8');
        debugTypeCheck(`[8.${attempt}] AI attempted fix in ${(performance.now() - fixStart).toFixed(2)} ms`);
      } else {
        throw new Error(`Type errors persist after ${attempt} fixes:\n${errors}`);
      }
    }

    throw new Error('Unreachable state');
  } catch (error: unknown) {
    debug('[Error] Component implementation failed: %O', error);
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

async function readAllTopLevelFiles(projectDir: string): Promise<Record<string, string>> {
  debug('[readAllTopLevelFiles] Reading project files from %s', projectDir);
  const start = performance.now();
  const config: Record<string, string> = {};

  async function readRecursive(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(projectDir, fullPath);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', '.next', '.turbo'].includes(entry.name)) continue;
        await readRecursive(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        try {
          config[relativePath] = await fs.readFile(fullPath, 'utf-8');
        } catch (err) {
          debug(`Failed to read ${relativePath}: ${(err as Error).message}`);
        }
      }
    }
  }

  await readRecursive(projectDir);
  debug(`[readAllTopLevelFiles] Completed in ${(performance.now() - start).toFixed(2)} ms`);
  return config;
}

async function runTypeCheckForFile(
  projectDir: string,
  filePath: string,
): Promise<{ success: boolean; errors: string }> {
  const start = performance.now();
  try {
    const tsconfigRoot = await findProjectRoot(projectDir);
    const relativeFilePath = path.relative(tsconfigRoot, filePath);
    const result = await execa('npx', ['tsc', '--noEmit', '--skipLibCheck', '--pretty', 'false'], {
      cwd: tsconfigRoot,
      stdio: 'pipe',
      reject: false,
    });

    const output = (result.stdout ?? '') + (result.stderr ?? '');
    debugTypeCheck(`[runTypeCheckForFile] Finished tsc in ${(performance.now() - start).toFixed(2)} ms`);

    if (result.exitCode === 0 && !output.includes('error TS')) return { success: true, errors: '' };

    const filteredErrors = output
      .split('\n')
      .filter((line) => {
        const hasError = line.includes('error TS');
        const notNodeModules = !line.includes('node_modules');
        const inTargetFile = line.includes(relativeFilePath) || line.includes(filePath);
        return hasError && notNodeModules && inTargetFile;
      })
      .join('\n');

    if (filteredErrors.trim().length === 0) return { success: true, errors: '' };
    return { success: false, errors: filteredErrors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: message };
  }
}

async function findProjectRoot(startDir: string): Promise<string> {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    try {
      await fs.access(path.join(dir, 'package.json'));
      await fs.access(path.join(dir, 'tsconfig.json'));
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error('Could not find project root (no package.json or tsconfig.json found)');
}

async function readDesignSystem(
  providedPath: string,
  refs: { projectDir: string; iaSchemeDir: string },
): Promise<string> {
  const start = performance.now();
  const candidates: string[] = [];
  if (providedPath) {
    candidates.push(providedPath);
    if (!path.isAbsolute(providedPath)) {
      candidates.push(path.resolve(refs.projectDir, providedPath));
      candidates.push(path.resolve(refs.iaSchemeDir, providedPath));
    }
  }

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate, 'utf-8');
      debug(`[readDesignSystem] Loaded from ${candidate} in ${(performance.now() - start).toFixed(2)} ms`);
      return content;
    } catch {
      debug(`[readDesignSystem] Could not read design system from %s`, candidate);
    }
  }

  debug(`[readDesignSystem] Design system not found, elapsed ${(performance.now() - start).toFixed(2)} ms`);
  return '';
}

function sanitizeCodeOutput(output: string): string {
  if (!output) return '';
  const cleaned = output.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/gm, '$1').trim();
  return cleaned || output.trim();
}

// eslint-disable-next-line complexity
function makeComponentPrompt(
  componentType: string,
  componentName: string,
  componentDef: Record<string, unknown>,
  existingScaffold: string,
  projectConfig: Record<string, string>,
  designSystemReference: string,
): string {
  const hasScaffold = Boolean(existingScaffold) && existingScaffold.trim().length > 0;

  const gqlFiles: Record<string, string> = {};
  const graphqlFiles: Record<string, string> = {};
  const otherFiles: Record<string, string> = {};

  for (const [filePath, content] of Object.entries(projectConfig)) {
    const normalized = filePath.toLowerCase();
    if (normalized.includes('src/gql/')) gqlFiles[filePath] = content;
    else if (normalized.includes('src/graphql/')) graphqlFiles[filePath] = content;
    else otherFiles[filePath] = content;
  }

  const queriesFile = Object.entries(graphqlFiles).find(([n]) => n.endsWith('queries.ts'))?.[1] ?? '';
  const mutationsFile = Object.entries(graphqlFiles).find(([n]) => n.endsWith('mutations.ts'))?.[1] ?? '';

  const gqlSection =
    Object.keys(gqlFiles).length > 0
      ? Object.entries(gqlFiles)
          .map(([path, content]) => `### ${path}\n${content}`)
          .join('\n\n')
      : '(No gql folder or generated GraphQL types found)';

  const graphqlSection =
    Object.keys(graphqlFiles).length > 0
      ? Object.entries(graphqlFiles)
          .map(([path, content]) => `### ${path}\n${content}`)
          .join('\n\n')
      : '(No graphql files found)';

  const configSection =
    Object.keys(otherFiles).length > 0
      ? Object.entries(otherFiles)
          .map(([path, content]) => `### ${path}\n${content}`)
          .join('\n\n')
      : '(No additional config files found)';

  const designSystemBlock =
    designSystemReference && designSystemReference.trim().length > 0
      ? `\n\n## 4. Design System Reference\n${designSystemReference}\n`
      : '\n\n## 4. Design System Reference\n(No design system content provided)\n';

  return `
You are Auto, a senior frontend engineer specializing in TypeScript React + Apollo Client.

Implement or complete the ${componentType} **${componentName}** using the provided IA schema, project configuration, and existing GraphQL setup.

---

## 1. Project Configuration Context
${configSection}

---

## 2. GraphQL Codegen Output (src/gql)
${gqlSection}

---

## 3. GraphQL Queries and Mutations (src/graphql)
${graphqlSection}

### Full Content of src/graphql/queries.ts
\`\`\`ts
${queriesFile || '(queries.ts not found)'}
\`\`\`

### Full Content of src/graphql/mutations.ts
\`\`\`ts
${mutationsFile || '(mutations.ts not found)'}
\`\`\`

---

### Usage Guideline
- Always import existing operations from \`src/graphql/queries\` or \`src/graphql/mutations\`.
- Never redefine gql or graphql strings inline.
- Use typed hooks from \`src/gql/\` if available.
- Follow the existing design system and maintain project style consistency.

---

${designSystemBlock}

---

## 5. Component Specification
**Component:** ${componentName}  
**Type:** ${componentType}

Definition (from IA Schema):
\`\`\`json
${JSON.stringify(componentDef, null, 2)}
\`\`\`

${hasScaffold ? 'Existing Scaffold:' : 'No Scaffold Found:'}
${hasScaffold ? `\n\n${existingScaffold}` : '\n(no existing file)'}

---

### GraphQL and Type Definition Rules
- **Always derive types from the provided GraphQL schema or generated types under \`src/gql/\`.**
- If a GraphQL query or mutation is used, import its **exact generated type** from \`src/gql/\` (e.g., \`GetUserQuery\`, \`UpdateTaskMutation\`).
- When creating local types for entities, ensure they **mirror the GraphQL schema** — names, fields, nullability, and nesting must match.
- Never invent or rename fields that are not present in the schema.
- Avoid guessing structures; infer shapes from the provided queries, mutations, or generated TypeScript definitions.

---

### Type Safety Requirements
- Never use \`as\` or non-null assertions (\`!\`) to bypass TypeScript type checking.
- Always infer or define proper types instead of forcing them.
- Do not use \`any\` or \`unknown\` unless absolutely necessary.
- Write code that passes \`--strict\` TypeScript checks without manual type coercion.

---

### Context-Aware UX Enhancements
- When implementing this component, analyze its purpose and definition to identify **natural opportunities for advanced interaction**.
- If the component involves **lists, cards, workflows, task ordering, layout editing, or visual grouping**, consider adding intuitive interactions such as:
  - drag-and-drop reordering (using existing libraries like \`@dnd-kit\` or similar if present),
  - inline editing or keyboard navigation,
  - smooth animations for movement or rearrangement.
- Only include such enhancements if they **fit the component’s role and improve the user experience** without overcomplicating the design.
- Never add drag-and-drop or other advanced behavior by default — only when it meaningfully enhances usability and aligns with the IA schema’s intent.

---

Return only the final, complete TypeScript React component source code for ${componentName}.
`;
}

function extractComposition(componentDef: Record<string, unknown>): string[] {
  if ('composition' in componentDef && Boolean(componentDef.composition)) {
    const comp = componentDef.composition as Record<string, unknown>;
    if ('atoms' in comp && Array.isArray(comp.atoms)) return comp.atoms as string[];
    if ('molecules' in comp && Array.isArray(comp.molecules)) return comp.molecules as string[];
  }
  return [];
}

function extractSpecs(componentDef: Record<string, unknown>): string[] {
  return Array.isArray(componentDef.specs) ? (componentDef.specs as string[]) : [];
}

function isValidCollection(collection: unknown): collection is { items: Record<string, unknown> } {
  if (collection === null || collection === undefined) return false;
  if (typeof collection !== 'object') return false;
  if (!('items' in collection)) return false;
  const items = (collection as { items: unknown }).items;
  return typeof items === 'object' && items !== null;
}

export default commandHandler;
