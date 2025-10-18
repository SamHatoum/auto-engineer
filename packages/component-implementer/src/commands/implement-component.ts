// noinspection ExceptionCaughtLocallyJS

import { type Command, defineCommandHandler, type Event } from '@auto-engineer/message-bus';
import * as fs from 'fs/promises';
import * as path from 'path';
import createDebug from 'debug';
import { callAI, loadScheme } from '../agent';
import { execa } from 'execa';
import { performance } from 'perf_hooks';

const debug = createDebug('auto:client-implementer:component');
const debugTypeCheck = createDebug('auto:client-implementer:component:typecheck');
const debugProcess = createDebug('auto:client-implementer:component:process');
const debugResult = createDebug('auto:client-implementer:component:result');

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
    aiOptions?: {
      temperature?: number;
      maxTokens?: number;
    };
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
      description: 'Type of component: atom|molecule|organism|page',
      required: true,
    },
    filePath: { description: 'Component file path', required: true },
    componentName: { description: 'Name of component to implement', required: true },
    failures: { description: 'Any failures from previous implementations', required: false },
    aiOptions: {
      description: 'AI generation options',
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
      debug('Component implemented successfully: %s/%s', result.data.componentType, result.data.componentName);
    } else {
      debug('Component implementation failed: %s', result.data.error);
    }
    return result;
  },
});

// eslint-disable-next-line complexity
async function handleImplementComponentCommandInternal(
  command: ImplementComponentCommand,
): Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent> {
  const { projectDir, iaSchemeDir, designSystemPath, componentType, componentName, filePath } = command.data;

  try {
    const start = performance.now();
    debugProcess(`Starting ${componentType}:${componentName}`);

    const t1 = performance.now();
    const scheme = await loadScheme(iaSchemeDir);
    debugProcess(`[1] Loaded IA scheme in ${(performance.now() - t1).toFixed(2)} ms`);
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
      debugProcess(`[2] Found existing scaffold in ${(performance.now() - t2).toFixed(2)} ms`);
    } catch {
      debugProcess(`[2] No existing scaffold found (${(performance.now() - t2).toFixed(2)} ms)`);
    }

    const t3 = performance.now();
    const projectConfig = await readAllTopLevelFiles(projectDir);
    debugProcess(`[3] Loaded project + gql/graphql files in ${(performance.now() - t3).toFixed(2)} ms`);

    const t4 = performance.now();
    const designSystemReference = await readDesignSystem(designSystemPath, { projectDir, iaSchemeDir });
    debugProcess(`[4] Loaded design system reference in ${(performance.now() - t4).toFixed(2)} ms`);

    const dependencyList = await resolveDependenciesRecursively(
      scheme as Record<string, unknown>,
      componentType,
      componentName,
    );

    debugProcess(`[5] Resolved ${dependencyList.length} dependencies for ${componentName}`);

    const dependencySources: Record<string, string> = {};
    for (const dep of dependencyList) {
      const depSource = await readComponentSource(projectDir, dep.type, dep.name);
      if (depSource != null) dependencySources[`${dep.type}/${dep.name}`] = depSource;
    }

    const basePrompt = makeBasePrompt(
      componentType,
      componentName,
      componentDef,
      existingScaffold,
      projectConfig,
      designSystemReference,
      dependencySources,
    );

    await fs.mkdir(path.dirname(outPath), { recursive: true });

    let attempt = 1;
    let code = '';
    let lastErrors = '';
    const maxAttempts = 3;

    while (attempt <= maxAttempts) {
      const genStart = performance.now();
      const prompt =
        attempt === 1
          ? makeImplementPrompt(basePrompt)
          : makeRetryPrompt(basePrompt, componentType, componentName, code, lastErrors);

      const aiRaw = await callAI(prompt, command.data.aiOptions);
      code = extractCodeBlock(aiRaw);
      await fs.writeFile(outPath, code, 'utf-8');
      debugProcess(
        `[6.${attempt}] AI output written (${code.length} chars) in ${(performance.now() - genStart).toFixed(2)} ms`,
      );

      const checkStart = performance.now();
      const { success, errors } = await runTypeCheckForFile(projectDir, outPath);
      debugTypeCheck(
        `[7.${attempt}] Type check in ${(performance.now() - checkStart).toFixed(2)} ms (success: ${success})`,
      );

      if (success) {
        debugResult(`[✓] Implementation succeeded in ${(performance.now() - start).toFixed(2)} ms total`);
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

      lastErrors = errors;
      if (attempt === maxAttempts) throw new Error(`Type errors persist after ${attempt} attempts:\n${errors}`);
      attempt += 1;
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

// eslint-disable-next-line complexity
async function resolveDependenciesRecursively(
  scheme: Record<string, unknown>,
  type: string,
  name: string,
  visited: Set<string> = new Set(),
): Promise<{ type: string; name: string }[]> {
  const key = `${type}:${name}`;
  if (visited.has(key)) return [];
  visited.add(key);

  const collection = scheme[`${type}s`];
  //
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!collection || !isValidCollection(collection)) return [];

  const def = collection.items[name];
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!def || typeof def !== 'object' || !('composition' in def)) return [];

  const result: { type: string; name: string }[] = [];

  const composition = def.composition as Record<string, string[]>;
  for (const [subType, subNames] of Object.entries(composition)) {
    if (!Array.isArray(subNames)) continue;
    for (const subName of subNames) {
      result.push({ type: subType, name: subName });
      const nested = await resolveDependenciesRecursively(scheme, subType, subName, visited);
      result.push(...nested);
    }
  }
  return result;
}

async function readComponentSource(projectDir: string, type: string, name: string): Promise<string | null> {
  const file = path.join(projectDir, 'src', 'components', type, `${name}.tsx`);
  try {
    return await fs.readFile(file, 'utf-8');
  } catch {
    return null;
  }
}

function extractCodeBlock(text: string): string {
  return text
    .replace(/```(?:tsx|ts|typescript)?/g, '')
    .replace(/```/g, '')
    .trim();
}

async function readAllTopLevelFiles(projectDir: string): Promise<Record<string, string>> {
  debugProcess('[readAllTopLevelFiles] Reading project files from %s', projectDir);
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
          debugProcess(`Failed to read ${relativePath}: ${(err as Error).message}`);
        }
      }
    }
  }

  await readRecursive(projectDir);
  debugProcess(`[readAllTopLevelFiles] Completed in ${(performance.now() - start).toFixed(2)} ms`);
  return config;
}

async function runTypeCheckForFile(
  projectDir: string,
  filePath: string,
): Promise<{ success: boolean; errors: string }> {
  const start = performance.now();
  try {
    const tsconfigRoot = await findProjectRoot(projectDir);
    const relativeFilePath = path.relative(tsconfigRoot, filePath).replace(/\\/g, '/');
    const normalizedRelative = relativeFilePath.replace(/^client\//, '');
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
        const matchesTarget =
          line.includes(relativeFilePath) ||
          line.includes(normalizedRelative) ||
          line.includes(path.basename(filePath));
        return hasError && notNodeModules && matchesTarget;
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

// eslint-disable-next-line complexity
function makeBasePrompt(
  componentType: string,
  componentName: string,
  componentDef: Record<string, unknown>,
  existingScaffold: string,
  projectConfig: Record<string, string>,
  designSystemReference: string,
  dependencySources: Record<string, string>,
): string {
  const hasScaffold = Boolean(existingScaffold?.trim());

  const gqlFiles: Record<string, string> = {};
  const graphqlFiles: Record<string, string> = {};
  const otherFiles: Record<string, string> = {};

  for (const [filePath, content] of Object.entries(projectConfig)) {
    const lower = filePath.toLowerCase();
    if (lower.includes('src/gql/')) gqlFiles[filePath] = content;
    else if (lower.includes('src/graphql/')) graphqlFiles[filePath] = content;
    else otherFiles[filePath] = content;
  }

  const queriesFile = Object.entries(graphqlFiles).find(([n]) => n.endsWith('queries.ts'))?.[1] ?? '';
  const mutationsFile = Object.entries(graphqlFiles).find(([n]) => n.endsWith('mutations.ts'))?.[1] ?? '';

  const gqlSection =
    Object.entries(gqlFiles)
      .map(([p, c]) => `### ${p}\n${c}`)
      .join('\n\n') || '(No gql folder found)';

  const graphqlSection =
    Object.entries(graphqlFiles)
      .map(([p, c]) => `### ${p}\n${c}`)
      .join('\n\n') || '(No graphql folder found)';

  const configSection =
    Object.entries(otherFiles)
      .map(([p, c]) => `### ${p}\n${c}`)
      .join('\n\n') || '(No additional config files)';

  const designSystemBlock = designSystemReference.trim()
    ? designSystemReference
    : '(No design system content provided)';

  const dependencySection =
    Object.entries(dependencySources)
      .map(([name, src]) => `### ${name}\n${src}`)
      .join('\n\n') || '(No dependencies found)';

  return `
# Implementation Brief: ${componentName} (${componentType})

You are a senior frontend engineer specializing in **React + TypeScript + Apollo Client**.  
Your task is to build a visually excellent, type-safe, and production-ready ${componentType} component.  
The goal is to deliver elegant, minimal, and robust code that integrates perfectly with the existing system.

---

## Objective
Implement **${componentName}** as defined in the IA schema and design system.  
Your component must:
- Compile cleanly with no TypeScript errors.
- Follow established design tokens, colors, and spacing.
- Be visually polished, responsive, and accessible.
- Reuse existing atoms/molecules/organisms wherever possible.
- Use valid imports only — no new dependencies or mock data.

---

## Project Context

**File Path:** src/components/${componentType}/${componentName}.tsx  
**Purpose:** A reusable UI element connected to the GraphQL layer and design system.  

### IA Schema
${JSON.stringify(componentDef, null, 2)}

### Existing Scaffold
${hasScaffold ? existingScaffold : '(No existing scaffold found)'}

### Design System Reference
${designSystemBlock}

### Related Components (Dependencies)
${dependencySection}

### GraphQL Context (src/graphql)
${graphqlSection}

#### queries.ts
${queriesFile || '(queries.ts not found)'}

#### mutations.ts
${mutationsFile || '(mutations.ts not found)'}

### GraphQL Codegen (src/gql)
${gqlSection}

### Other Relevant Files
${configSection}

---

## Engineering Guidelines

**Type Safety**
- Explicitly type all props, state, and GraphQL responses.
- Avoid \`any\` — prefer discriminated unions, interfaces, and generics.

**React Practices**
- Never call setState during render.
- Always use dependency arrays in effects.
- Memoize computed values and callbacks.
- Keep rendering pure and predictable.

**Error Handling**
- Wrap async operations in try/catch with graceful fallback UI.
- Check for null/undefined using optional chaining (?.) and defaults (??).

**Visual & UX Quality**
- Perfect spacing and alignment using Tailwind or the design system tokens.
- Add subtle hover, focus, and loading states.
- Use accessible HTML semantics and ARIA attributes.
- Animate with Framer Motion when appropriate.

**Performance**
- Prevent unnecessary re-renders with React.memo and stable references.
- Avoid redundant state and computations.

**Consistency**
- Follow established color, typography, and spacing scales.
- Match button, card, and badge styles with existing components.

**Prohibited**
- No placeholder data, TODOs, or pseudo-logic.
- No new external packages.
- No commented-out or partial implementations.

---

## Visual Quality Checklist
- Consistent vertical rhythm and alignment.  
- Smooth hover and transition states.  
- Responsive design that looks intentional at all breakpoints.  
- Uses design tokens and existing components wherever possible.  
- Clear visual hierarchy and accessible structure.

---

## Validation Checklist
- Compiles cleanly with \`tsc --noEmit\`.  
- Imports exist and resolve correctly.  
- Component matches the design system and IA schema.  
- No unused props, variables, or imports.  
- Visually and functionally complete.

---

**Final Output Requirement:**  
Return only the complete \`.tsx\` source code for this component — no markdown fences, commentary, or extra text.
`.trim();
}

function makeImplementPrompt(basePrompt: string): string {
  return `${basePrompt}

---

Generate the **complete final implementation** for \`${basePrompt}\`.  
Begin directly with import statements and end with the export statement.  
Do not include markdown fences, comments, or explanations — only the valid .tsx file content.
`.trim();
}

function makeRetryPrompt(
  basePrompt: string,
  componentType: string,
  componentName: string,
  previousCode: string,
  previousErrors: string,
): string {
  return `
${basePrompt}

---

### Correction Task
The previously generated ${componentType} component **${componentName}** failed TypeScript validation.  
Fix only the issues listed below without altering logic or layout.

**Errors**
${previousErrors}

**Previous Code**
${previousCode}

---

### Correction Rules
- Fix only TypeScript or import errors.  
- Do not change working logic or structure.  
- Keep eslint directives and formatting intact.  
- Return the corrected \`.tsx\` file only, with no markdown fences or commentary.
`.trim();
}

/* -------------------------------------------------------------------------- */

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
      debugProcess(`[readDesignSystem] Loaded from ${candidate} in ${(performance.now() - start).toFixed(2)} ms`);
      return content;
    } catch {
      debugProcess(`[readDesignSystem] Could not read design system from %s`, candidate);
    }
  }

  debugProcess(`[readDesignSystem] Design system not found, elapsed ${(performance.now() - start).toFixed(2)} ms`);
  return '';
}
