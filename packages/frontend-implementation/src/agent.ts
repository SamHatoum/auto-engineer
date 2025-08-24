import { AIProvider, generateTextWithAI, generateTextWithImageAI } from '@auto-engineer/ai-gateway';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  closeBrowser,
  getBuildErrors,
  getConsoleErrors,
  getPageScreenshot,
  getTsErrors,
} from '@auto-engineer/frontend-checks';
import * as ts from 'typescript';
import createDebug from 'debug';

const debug = createDebug('frontend-impl:agent');
const debugPlan = createDebug('frontend-impl:agent:plan');
const debugErrors = createDebug('frontend-impl:agent:errors');
const debugScreenshots = createDebug('frontend-impl:agent:screenshots');
const debugFixes = createDebug('frontend-impl:agent:fixes');
const debugContext = createDebug('frontend-impl:agent:context');
const debugAI = createDebug('frontend-impl:agent:ai');
const debugFiles = createDebug('frontend-impl:agent:files');
const debugComponents = createDebug('frontend-impl:agent:components');

// Utility to extract props from interface
function extractPropsFromInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
): { name: string; type: string }[] {
  debugComponents('Extracting props from interface: %s', node.name.text);
  const props = node.members.filter(ts.isPropertySignature).map((member) => {
    const name = member.name.getText(sourceFile);
    const type = member.type ? member.type.getText(sourceFile) : 'any';
    debugComponents('  Property: %s: %s', name, type);
    return { name, type };
  });
  debugComponents('Extracted %d props from interface', props.length);
  return props;
}

// Utility to extract props from type alias
function extractPropsFromTypeAlias(
  node: ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
): { name: string; type: string }[] {
  debugComponents('Extracting props from type alias: %s', node.name.text);
  if (!ts.isTypeLiteralNode(node.type)) {
    debugComponents('  Type alias is not a type literal, skipping');
    return [];
  }
  const props = node.type.members.filter(ts.isPropertySignature).map((member) => {
    const name = member.name.getText(sourceFile);
    const type = member.type ? member.type.getText(sourceFile) : 'any';
    debugComponents('  Property: %s: %s', name, type);
    return { name, type };
  });
  debugComponents('Extracted %d props from type alias', props.length);
  return props;
}

// Extract atoms and their props from src/components/atoms
async function getAtomsWithProps(
  projectDir: string,
): Promise<{ name: string; props: { name: string; type: string }[] }[]> {
  const atomsDir = path.join(projectDir, 'src/components/atoms');
  debugComponents('Getting atoms from: %s', atomsDir);
  let files: string[] = [];
  try {
    files = (await fs.readdir(atomsDir)).filter((f) => f.endsWith('.tsx'));
    debugComponents('Found %d atom files', files.length);
  } catch (error) {
    debugComponents('Error reading atoms directory: %O', error);
    return [];
  }
  const atoms: { name: string; props: { name: string; type: string }[] }[] = [];
  for (const file of files) {
    const filePath = path.join(atomsDir, file);
    debugComponents('Processing atom file: %s', file);
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    let componentName = file.replace(/\.tsx$/, '');
    componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    debugComponents('Component name: %s', componentName);
    let props: { name: string; type: string }[] = [];
    ts.forEachChild(sourceFile, (node) => {
      if (
        ts.isInterfaceDeclaration(node) &&
        node.name.text.toLowerCase().includes(componentName.toLowerCase()) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true
      ) {
        props = extractPropsFromInterface(node, sourceFile);
      }
      if (
        ts.isTypeAliasDeclaration(node) &&
        node.name.text.toLowerCase().includes(componentName.toLowerCase()) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true
      ) {
        props = extractPropsFromTypeAlias(node, sourceFile);
      }
    });
    atoms.push({ name: componentName, props });
    debugComponents('Added atom %s with %d props', componentName, props.length);
  }
  debugComponents('Total atoms extracted: %d', atoms.length);
  return atoms;
}

const provider = AIProvider.Anthropic;

function extractJsonArray(text: string): string {
  debugAI('Extracting JSON array from text of length: %d', text.length);
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    debugAI('Found JSON in code block');
    return codeBlockMatch[1].trim();
  }
  const arrayMatch = text.match(/(\[[\s\S]*\])/);
  if (arrayMatch) {
    debugAI('Found JSON array in text');
    return arrayMatch[0];
  }
  debugAI('No JSON array found, returning original text');
  return text;
}

async function callAI(prompt: string, options?: { temperature?: number; maxTokens?: number }) {
  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? 4000;
  debugAI('Calling AI with prompt length: %d, temperature: %f, maxTokens: %d', prompt.length, temperature, maxTokens);
  const result = await generateTextWithAI(prompt, provider, { temperature, maxTokens });
  debugAI('AI response received, length: %d', result.length);
  return result.trim();
}

// Copy the Scheme type from index.ts for local use
interface Scheme {
  generatedComponents?: { type: string; items?: Record<string, unknown> }[];
  atoms?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  molecules?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  organisms?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  pages?: {
    description?: string;
    items?: Record<
      string,
      {
        route: string;
        description: string;
        layout?: unknown;
        navigation?: unknown;
        [key: string]: unknown;
      }
    >;
  };
}

interface ProjectContext {
  scheme: Scheme | undefined;
  files: string[];
  atoms: { name: string; props: { name: string; type: string }[] }[];
  keyFileContents: Record<string, string>;
  fileTreeSummary: string[];
  graphqlOperations: Record<string, string>;
  userPreferences: string;
  theme: string;
}

// eslint-disable-next-line complexity
async function loadScheme(iaSchemeDir: string): Promise<Scheme | undefined> {
  const schemePath = path.join(iaSchemeDir, 'auto-ia-scheme.json');
  debugContext('Loading IA scheme from: %s', schemePath);
  try {
    const content = await fs.readFile(schemePath, 'utf-8');
    const scheme = JSON.parse(content) as Scheme;
    debugContext('IA scheme loaded successfully');
    debugContext(
      'Scheme has %d pages, %d organisms, %d molecules, %d atoms',
      Object.keys(scheme.pages?.items ?? {}).length,
      Object.keys(scheme.organisms?.items ?? {}).length,
      Object.keys(scheme.molecules?.items ?? {}).length,
      Object.keys(scheme.atoms?.items ?? {}).length,
    );
    return scheme;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code !== 'ENOENT') {
      debugContext('Error loading scheme: %O', err);
      throw err;
    }
    debugContext('Scheme file not found');
    return undefined;
  }
}

async function getGraphqlOperations(projectDir: string, files: string[]): Promise<Record<string, string>> {
  const graphqlFiles = files.filter((f) => f.startsWith('src/graphql/') && f.endsWith('.ts'));
  debugContext('Found %d GraphQL files', graphqlFiles.length);
  const operations: Record<string, string> = {};
  for (const filePath of graphqlFiles) {
    try {
      debugContext('Reading GraphQL file: %s', filePath);
      const content = await fs.readFile(path.join(projectDir, filePath), 'utf-8');
      const operationName = path.basename(filePath, '.ts');
      operations[operationName] = content;
      debugContext('Loaded GraphQL operations from %s', operationName);
    } catch (error) {
      debugContext('Error reading GraphQL operations file %s: %O', filePath, error);
      console.error(`Error reading GraphQL operations file ${filePath}:`, error);
    }
  }
  debugContext('Total GraphQL operations loaded: %d', Object.keys(operations).length);
  return operations;
}

async function getKeyFileContents(projectDir: string, files: string[]): Promise<Record<string, string>> {
  const keyFiles = files.filter((f) => ['src/index.css', 'src/globals.css'].includes(f));
  debugContext('Getting key file contents for %d files', keyFiles.length);
  const contents: Record<string, string> = {};
  for (const file of keyFiles) {
    try {
      debugContext('Reading key file: %s', file);
      contents[file] = await fs.readFile(path.join(projectDir, file), 'utf-8');
      debugContext('Key file %s loaded, size: %d bytes', file, contents[file].length);
    } catch (error) {
      debugContext('Could not read key file %s: %O', file, error);
    }
  }
  debugContext('Loaded %d key files', Object.keys(contents).length);
  return contents;
}

function getFileTreeSummary(
  files: string[],
  atoms: { name: string; props: { name: string; type: string }[] }[],
): string[] {
  return [
    ...files.filter(
      (f) =>
        f.startsWith('src/pages/') ||
        f.startsWith('src/hooks/') ||
        f.startsWith('src/lib/') ||
        ['src/App.tsx', 'src/routes.tsx', 'src/main.tsx'].includes(f),
    ),
    `src/components/atoms/ (atoms: ${atoms.map((a) => a.name).join(', ')})`,
  ];
}

async function getTheme(designSystem: string): Promise<string> {
  debugContext('Extracting theme from design system, content length: %d', designSystem.length);
  try {
    const themeMatch = designSystem.match(/## Theme\s*\n([\s\S]*?)(?=\n## |\n# |\n*$)/);
    if (themeMatch && themeMatch[1]) {
      const theme = themeMatch[1].trim();
      debugContext('Theme extracted, length: %d', theme.length);
      return theme;
    }
    debugContext('No theme section found in design system');
    return '';
  } catch (error) {
    debugContext('Error extracting theme: %O', error);
    console.error(`Error reading design-system.md:`, error);
    return '';
  }
}

async function getProjectContext(
  projectDir: string,
  iaSchemeDir: string,
  userPreferences: string,
  designSystem: string,
): Promise<ProjectContext> {
  debugContext('Building project context for: %s', projectDir);
  debugContext('IA scheme directory: %s', iaSchemeDir);
  debugContext('User preferences length: %d', userPreferences.length);
  debugContext('Design system length: %d', designSystem.length);

  const files = await listFiles(projectDir);
  debugContext('Found %d files in project', files.length);

  const [scheme, atoms, graphqlOperations, keyFileContents, theme] = await Promise.all([
    loadScheme(iaSchemeDir),
    getAtomsWithProps(projectDir),
    getGraphqlOperations(projectDir, files),
    getKeyFileContents(projectDir, files),
    getTheme(designSystem),
  ]);

  const fileTreeSummary = getFileTreeSummary(files, atoms);
  debugContext('File tree summary created with %d entries', fileTreeSummary.length);

  debugContext('Project context built successfully');
  return {
    scheme,
    files,
    atoms,
    keyFileContents,
    fileTreeSummary,
    graphqlOperations,
    userPreferences,
    theme,
  };
}

async function listFiles(dir: string, base = dir): Promise<string[]> {
  debugFiles('Listing files in: %s', dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  debugFiles('Found %d entries in directory', entries.length);

  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === 'node_modules') {
        debugFiles('Skipping node_modules');
        return [];
      }

      const res = path.resolve(dir, entry.name);

      if (entry.isDirectory()) {
        debugFiles('Entering directory: %s', entry.name);
        return listFiles(res, base);
      } else {
        return [path.relative(base, res)];
      }
    }),
  );

  const flatFiles = files.flat();
  debugFiles('Total files found: %d', flatFiles.length);
  return flatFiles;
}

function makeBasePrompt(ctx: ProjectContext): string {
  const keyFileContents = Object.entries(ctx.keyFileContents)
    .map(([f, c]) => `--- ${f} ---\n${c}\n`)
    .join('\n');

  const graphqlDescriptions = Object.entries(ctx.graphqlOperations)
    .map(([f, c]) => `--- ${f} ---\n${c}\n`)
    .join('\n');

  return `
You are Auto, an expert AI frontend engineer specializing in scalable, clean, production-grade React applications using modern TypeScript, and GraphQL via Apollo Client.

Your task: Analyze the current project and generate a complete plan to implement a well-structured, schema-compliant React app using atomic design and integrated GraphQL operations. You must ensure code clarity, maintainability, and adherence to project styling conventions.

User Preferences: ${ctx.userPreferences}

IMPLEMENTATION MUST:
- DONT EVER CHANGE THE THEME TOKENS BY YOURSELF
- If there are any page templates in the user preferences make sure to use that layout for pages.

Component Design & Structure:
- Follow atomic design:
  - Build molecules → organisms → pages
  - Then update routing in \`App.tsx\` accordingly. **DO NOT FORGET THIS.**
- Only create pages that are explicitly listed in \`auto-ia-scheme.json\`. No extra routes.
- If a root page is not explicitly listed in \`auto-ia-scheme.json\`, then make the root page an index to all the other routes
- Reuse atoms/molecules/organisms when possible. Only create new components when absolutely required.
- Use responsive layout by default.
- Use a consistent spacing scale (4/8/12/16px).
- Component files must stay under 50 lines when possible.
- All components must be typed. Use the format \`<ComponentName>Props\`.

Component Responsibilities:
- Components must not include generic or redundant headings to represent structure.
- Page-level wrappers must **not** introduce headings unless absolutely necessary.
- Use semantic structure, branded color tokens, spacing, and layout to indicate purpose.

Code Standards:
- Use **TypeScript** throughout.
- Use **named exports and imports only**. Never use \`export default\`.
- Use relative imports across the app.
- Avoid prop drilling — prefer context or colocated state.
- Ensure accessibility (ARIA, keyboard nav, focus rings).
- Use toast notifications for critical feedback.
- Add console logs for key state transitions.
- Avoid layout jitter — use placeholder/stable containers during async rendering.
- Maintain modular folder structure aligned with atomic principles.

GraphQL Integration Rules:
- Use **Apollo Client**: \`useQuery\`, \`useMutation\`, \`useLazyQuery\`.
- GraphQL operations must be used inside molecules or organisms — **never inside atoms**.
- Use operations defined only in:
  - \`src/graphql/queries.ts\`
  - \`src/graphql/mutations.ts\`
- These files are **read-only**. You may not add, modify, or delete any GraphQL documents.
- If a GraphQL query doesn’t exactly match the UI, **adapt the UI** — never change the query.

Key File Rule:
When working with a key file, always assume it contains all needed imports/specs.
- Do **not** add or modify imports/specs in the key file. Implement based only on what is provided.

Output Format:
You must return a JSON array where each item contains:
- \`action\`: "create" | "update"
- \`file\`: Relative path from project root
- \`description\`: Short and clear explanation of the change

Respond with **only** a JSON array. No explanations. No markdown. No code blocks.

Here is a summary of the file tree:
${JSON.stringify(ctx.fileTreeSummary, null, 2)}

Here are the available atoms and their props:
${JSON.stringify(ctx.atoms, null, 2)}
And if there are no atoms found, make sure to use what the user preferences suggest. Like using a library atom component for example.

Here are the contents of key files:
${keyFileContents}

Here is the content of auto-ia-scheme.json:
${JSON.stringify(ctx.scheme, null, 2)}

Here are the descriptions of available GraphQL operations:
${graphqlDescriptions}
`;
}

interface Change {
  action: 'create' | 'update';
  file: string;
  description: string;
}

async function planProject(ctx: ProjectContext): Promise<Change[]> {
  debugPlan('Starting project planning');
  const prompt = makeBasePrompt(ctx);
  debugPlan('Generated prompt with length: %d', prompt.length);

  const planText = await callAI(prompt);
  debugPlan('Received plan response, length: %d', planText.length);

  try {
    const changes = JSON.parse(extractJsonArray(planText)) as Change[];
    debugPlan('Successfully parsed plan with %d changes', changes.length);
    changes.forEach((change, idx) => {
      debugPlan('Change %d: %s %s - %s', idx + 1, change.action, change.file, change.description);
    });
    return changes;
  } catch (error) {
    debugPlan('Failed to parse plan: %O', error);
    console.error('Could not parse plan from LLM:', planText);
    return [];
  }
}

async function applyPlan(plan: Change[], ctx: ProjectContext, projectDir: string) {
  debugPlan('Applying plan with %d changes', plan.length);

  for (const [index, change] of plan.entries()) {
    debugPlan('Applying change %d/%d: %s %s', index + 1, plan.length, change.action, change.file);

    let fileContent = '';
    if (change.action === 'update') {
      try {
        fileContent = await fs.readFile(path.join(projectDir, change.file), 'utf-8');
        debugPlan('Read existing file %s, size: %d bytes', change.file, fileContent.length);
      } catch {
        debugPlan('File %s does not exist, will create', change.file);
      }
    }
    const codePrompt = `${makeBasePrompt(ctx)}\nHere is the planned change:\n${JSON.stringify(change, null, 2)}\n${
      change.action === 'update' ? `Here is the current content of ${change.file}:\n${fileContent}\n` : ''
    }Please output ONLY the full new code for the file (no markdown, no triple backticks, just code, ready to write to disk).`;
    const code = await callAI(codePrompt);
    debugPlan('Generated code for %s, size: %d bytes', change.file, code.length);

    const outPath = path.join(projectDir, change.file);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, code, 'utf-8');

    debugPlan('Successfully wrote file: %s', outPath);
    console.log(`${change.action === 'update' ? 'Updated' : 'Created'} ${change.file}`);
  }

  debugPlan('Plan application complete');
}

interface Fix {
  action: 'update';
  file: string;
  description: string;
  content: string;
}

async function fixTsErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  debugErrors('Checking for TypeScript errors in: %s', projectDir);
  const tsErrors = await getTsErrors(projectDir);
  debugErrors('Found %d TypeScript errors', tsErrors.length);
  console.log('Found', tsErrors.length, 'TypeScript errors');

  if (tsErrors.length === 0) {
    debugErrors('No TypeScript errors to fix');
    return false;
  }

  debugErrors('TypeScript errors found:');
  tsErrors.forEach((error, idx) => {
    debugErrors('  Error %d: %s', idx + 1, error);
  });

  const errorFeedback = tsErrors.join('\n');
  const fixupPrompt = `${makeBasePrompt(ctx)}\n
After your previous changes, the application produced the following TypeScript errors:\n\n${errorFeedback}\n
You must now fix **every** error listed above. This is a critical pass: if any error remains after your fix, your output is rejected.

Before generating code, analyze and validate your solution against every error. Use existing type definitions, component props, GraphQL typings, and shared interfaces from the project. Do not invent new types or structures unless absolutely necessary.

Strict rules:
- Never use \`any\`, \`as any\`, or unsafe type assertions
- Do not silence errors — resolve them fully and correctly
- Fix all errors in each file in one go
- Reuse existing logic or types instead of re-creating similar ones
- Do not modify the GraphQL files
- Do not submit partial updates; provide the full updated content of the file

Output must be a **JSON array** only. Each item must include:
- \`action\`: "update"
- \`file\`: relative path to the updated file
- \`description\`: "Fix TypeScript errors"
- \`content\`: full new content of the file, as a string

Do not include explanations, markdown, or code blocks.
`;
  const fixupPlanText = await callAI(fixupPrompt);
  let fixupPlan: Fix[] = [];
  try {
    fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)) as Fix[];
    debugFixes('Parsed TypeScript fixup plan with %d fixes', fixupPlan.length);
  } catch (e) {
    debugFixes('Failed to parse TypeScript fixup plan: %O', e);
    console.error('Could not parse TS fixup plan from LLM:', e instanceof Error ? e.message : String(e));
  }

  console.log('Fixup plan has', fixupPlan.length, 'items');

  for (const [index, fix] of fixupPlan.entries()) {
    debugFixes('Applying fix %d/%d: %s', index + 1, fixupPlan.length, fix.file);
    if (fix.action === 'update' && fix.file && fix.content) {
      const outPath = path.join(projectDir, fix.file);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, fix.content, 'utf-8');
      debugFixes('Successfully fixed TypeScript errors in %s', fix.file);
      console.log(`Fixed TS errors in ${fix.file}`);
    }
  }

  debugFixes('TypeScript error fixing complete');
  return true;
}

async function fixBuildErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  debugErrors('Checking for build errors in: %s', projectDir);
  const buildErrors = await getBuildErrors(projectDir);
  debugErrors('Found %d build errors', buildErrors.length);
  console.log('Found', buildErrors.length, 'build errors');

  if (buildErrors.length === 0) {
    debugErrors('No build errors to fix');
    return false;
  }

  debugErrors('Build errors found:');
  buildErrors.forEach((error, idx) => {
    debugErrors('  Error %d: %s', idx + 1, error);
  });

  const errorFeedback = buildErrors.join('\n');
  const fixupPrompt = `${makeBasePrompt(ctx)}\n
After your previous changes, the application produced the following build errors:\n\n${errorFeedback}\n
You must now fix **every** error listed above. This is a critical pass: if any error remains after your fix, your output is rejected.

Before generating code, analyze and validate your solution against every error. Use existing component props, imports, and shared interfaces from the project. Do not invent new structures unless absolutely necessary.

Strict rules:
- Never use unsafe imports or invalid module references
- Do not silence errors — resolve them fully and correctly
- Fix all errors in each file in one go
- Reuse existing logic instead of re-creating similar ones
- Do not modify the GraphQL files
- Do not submit partial updates; provide the full updated content of the file

Output must be a **JSON array** only. Each item must include:
- \`action\`: "update"
- \`file\`: relative path to the updated file
- \`description\`: "Fix build errors"
- \`content\`: full new content of the file, as a string

Do not include explanations, markdown, or code blocks.
`;
  const fixupPlanText = await callAI(fixupPrompt);
  let fixupPlan: Fix[] = [];
  try {
    fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)) as Fix[];
    debugFixes('Parsed build fixup plan with %d fixes', fixupPlan.length);
  } catch (e) {
    debugFixes('Failed to parse build fixup plan: %O', e);
    console.error('Could not parse build fixup plan from LLM:', e instanceof Error ? e.message : String(e));
  }

  console.log('Fixup plan has', fixupPlan.length, 'items');

  for (const [index, fix] of fixupPlan.entries()) {
    debugFixes('Applying fix %d/%d: %s', index + 1, fixupPlan.length, fix.file);
    if (fix.action === 'update' && fix.file && fix.content) {
      const outPath = path.join(projectDir, fix.file);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, fix.content, 'utf-8');
      debugFixes('Successfully fixed build errors in %s', fix.file);
      console.log(`Fixed build errors in ${fix.file}`);
    }
  }

  debugFixes('Build error fixing complete');
  return true;
}

// Helper to extract all page routes from the IA scheme
function extractPageRoutesFromScheme(scheme: Scheme | undefined): string[] {
  debugContext('Extracting page routes from scheme');
  if (scheme?.pages?.items && typeof scheme.pages.items === 'object') {
    const routes = Object.values(scheme.pages.items)
      .map((page) =>
        typeof page === 'object' && 'route' in page && typeof page.route === 'string' ? page.route : undefined,
      )
      .filter((route): route is string => typeof route === 'string');
    debugContext('Extracted %d routes: %o', routes.length, routes);
    return routes;
  }
  debugContext('No page routes found in scheme');
  return [];
}

async function checkRouteErrors(baseUrl: string, routes: string[]): Promise<string[]> {
  debugErrors('Checking console errors for %d routes', routes.length);
  const allConsoleErrors: string[] = [];

  for (const [index, route] of routes.entries()) {
    const url = baseUrl + (route.startsWith('/') ? route : '/' + route);
    debugErrors('Checking route %d/%d: %s', index + 1, routes.length, url);
    console.log(`Checking console errors for ${url}`);

    const errors = await getConsoleErrors(url);
    if (Array.isArray(errors) && errors.length > 0) {
      debugErrors('Found %d console errors on route %s', errors.length, route);
      allConsoleErrors.push(...errors.map((e: string) => `[${route}] ${e}`));
    } else {
      debugErrors('No console errors on route %s', route);
    }
  }

  debugErrors('Total console errors found: %d', allConsoleErrors.length);
  return allConsoleErrors;
}

async function applyFixes(fixupPlan: Fix[], projectDir: string): Promise<void> {
  debugFixes('Applying %d fixes', fixupPlan.length);

  for (const [index, fix] of fixupPlan.entries()) {
    if (fix.action !== 'update' || !fix.file || !fix.content) {
      debugFixes('Skipping invalid fix %d', index + 1);
      continue;
    }

    debugFixes('Applying fix %d/%d to %s', index + 1, fixupPlan.length, fix.file);
    const outPath = path.join(projectDir, fix.file);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, fix.content, 'utf-8');
    debugFixes('Successfully applied fix to %s', fix.file);
    console.log(`Fixed errors in ${fix.file}`);
  }

  debugFixes('All fixes applied');
}

async function fixConsoleErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  debugErrors('Starting console error check');
  const baseUrl = 'http://localhost:8080';

  let routes = extractPageRoutesFromScheme(ctx.scheme);
  if (routes.length === 0) {
    debugErrors('No routes found, defaulting to root');
    routes = ['/'];
  }
  debugErrors('Checking %d routes for console errors', routes.length);

  const allConsoleErrors = await checkRouteErrors(baseUrl, routes);
  console.log('Found', allConsoleErrors.length, 'console errors');

  if (allConsoleErrors.length === 0) {
    debugErrors('No console errors found');
    await closeBrowser();
    return false;
  }

  debugErrors('Console errors to fix:');
  allConsoleErrors.forEach((error, idx) => {
    debugErrors('  Error %d: %s', idx + 1, error);
  });

  const errorFeedback = allConsoleErrors.join('\n');
  const fixupPrompt = `${makeBasePrompt(ctx)}\n
After your previous changes, the application produced the following console errors when running on the following routes:\n\n${errorFeedback}\n
You must now fix **every** error listed above. This is a critical pass: if any error remains after your fix, your output is rejected.

Before generating code, analyze and validate your solution against every error. Use existing types, props, and logic from the project. Do not invent new structures unless absolutely necessary.

Strict rules:
- Ignore connection or network errors
- Never use \`any\`, unsafe type assertions, or silence errors
- Do not silence errors — resolve them fully and correctly
- Fix all errors in each file in one go
- Reuse existing logic or types instead of re-creating similar ones
- Do not submit partial updates; provide the full updated content of the file

Output must be a **JSON array** only. Each item must include:
- \`action\`: "update"
- \`file\`: relative path to the updated file
- \`description\`: "Fix console errors"
- \`content\`: full new content of the file, as a string

Do not include explanations, markdown, or code blocks.
`;
  let fixupPlan: Fix[] = [];
  try {
    const response = await callAI(fixupPrompt);
    fixupPlan = JSON.parse(extractJsonArray(response)) as Fix[];
    debugFixes('Parsed console error fixup plan with %d fixes', fixupPlan.length);
  } catch (e) {
    debugFixes('Failed to parse console error fixup plan: %O', e);
    console.error('Could not parse console fixup plan from LLM:', e instanceof Error ? e.message : String(e));
  }

  console.log('Fixup plan has', fixupPlan.length, 'items');
  await applyFixes(fixupPlan, projectDir);

  debugErrors('Closing browser after console error fixes');
  await closeBrowser();
  debugErrors('Console error fixing complete');
  return true;
}

async function checkVisualErrors(baseUrl: string, routes: string[], theme: string): Promise<string> {
  debugScreenshots('Checking visual errors for %d routes', routes.length);
  const screenshots = await getPageScreenshots(baseUrl, routes);
  debugScreenshots('Got %d screenshots', screenshots.length);

  let allVisualErrors: string = '';
  for (const [index, screenshot] of screenshots.entries()) {
    debugScreenshots('Analyzing screenshot %d/%d for route: %s', index + 1, screenshots.length, screenshot.route);
    console.log(`Checking visual errors for ${screenshot.route}`);
    const error = await generateTextWithImageAI(
      `
      This is the theme used: ${theme}. 
      When analyzing UI screenshots, only flag high-impact visual issues that significantly affect usability, accessibility, or user comprehension. Ignore minor spacing inconsistencies, slight misalignments, and non-critical aesthetic variations unless they create a clear functional or accessibility problem. Focus feedback on elements that:
      - Do not flag color or style choices that match the theme.
      - Do not critique placeholder contrast, alignment, or heading hierarchy unless the text is truly unreadable or confusing.
      - Ignore small alignment shifts, whitespace distribution, and center-aligned titles.
      - Only highlight contrast issues if they fail WCAG standards or make text functionally unreadable.
      - Do not mention the lack of loading indicators unless it causes a clear usability failure (e.g., users stuck or misled).
      - Focus only on issues that break flow, block interaction, or seriously reduce clarity.
      - Allow intentionally unique design elements like center-aligned titles.
      - Do not report white space as an issue when the layout is intentionally minimal.
      - Skip pixel-perfect feedback unless there’s a clear visual or structural flaw.
      - Focus on readability, navigability, accessibility, and broken UI flows.

      
      IMPORTANT: return in a nicely formatted markdown, easy to read for the user, not as array of markdown, pure markdown content! Include the route: ${screenshot.route} name, because I have multiple errors showing, and add an empty line at the end.
      IMPORTANT: don't overly nest the markdown sections, just one # Visual Report, below it the name of the route: ## Route: _route_name_, and ### _types_of_issues_ per route (can have multiple under same route) and bullet list after that
      IMPORTANT: return something only if you found valid errors, I don't want to show only the route name from the above request.
      `,
      screenshot.screenshot,
      AIProvider.OpenAI,
    );
    if (error) {
      debugScreenshots('Visual errors found on route %s', screenshot.route);
      allVisualErrors += error;
    } else {
      debugScreenshots('No visual errors on route %s', screenshot.route);
    }
  }

  debugScreenshots('Visual error check complete, total errors length: %d', allVisualErrors.length);
  return allVisualErrors;
}

async function getPageScreenshots(baseUrl: string, routes: string[]): Promise<{ route: string; screenshot: string }[]> {
  debugScreenshots('Taking screenshots for %d routes', routes.length);
  const pageScreenshots: { route: string; screenshot: string }[] = [];

  for (const [index, route] of routes.entries()) {
    const url = baseUrl + (route.startsWith('/') ? route : '/' + route);
    debugScreenshots('Taking screenshot %d/%d for: %s', index + 1, routes.length, url);
    console.log(`Taking screenshot for ${url}`);

    const screenshot = await getPageScreenshot(url);
    if (screenshot) {
      debugScreenshots('Screenshot captured for %s, size: %d bytes', route, screenshot.length);
      pageScreenshots.push({
        route: route,
        screenshot: screenshot,
      });
    } else {
      debugScreenshots('Failed to capture screenshot for %s', route);
    }
  }

  debugScreenshots('Closing browser after screenshots');
  await closeBrowser();
  debugScreenshots('Captured %d screenshots', pageScreenshots.length);
  return pageScreenshots;
}

async function reportVisualErrors(ctx: ProjectContext): Promise<void> {
  debugScreenshots('Starting visual error report');
  const baseUrl = 'http://localhost:8080';

  let routes = extractPageRoutesFromScheme(ctx.scheme);
  if (routes.length === 0) {
    debugScreenshots('No routes found, defaulting to root');
    routes = ['/'];
  }
  debugScreenshots('Reporting visual errors for %d routes', routes.length);

  const allVisualErrors = await checkVisualErrors(baseUrl, routes, ctx.theme);

  if (allVisualErrors) {
    debugScreenshots('Visual errors report generated, length: %d', allVisualErrors.length);
  } else {
    debugScreenshots('No visual errors to report');
  }

  console.log(allVisualErrors);
}

// async function fixVisualErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
//   const baseUrl = 'http://localhost:8080';
//   let routes = extractPageRoutesFromScheme(ctx.scheme);
//   if (routes.length === 0) {
//     routes = ['/'];
//   }
//
//   const allVisualErrors = await checkVisualErrors(baseUrl, routes, ctx.theme);
//   console.log('Found', allVisualErrors, 'visual errors');
//   if (allVisualErrors.length === 0) {
//     await closeBrowser();
//     return false;
//   }
//
//   const fixupPrompt = `${makeBasePrompt(ctx)}\n
// After your previous changes, the application has the following visual errors:\n\n${allVisualErrors}\n
// You must now fix **every** error listed above. This is a critical pass: if any error remains after your fix, your output is rejected.
//
// Before generating code, analyze and validate your solution against every error. Use existing types, props, and logic from the project. Do not invent new structures unless absolutely necessary.
//
// Strict rules:
// - Ignore connection or network errors
// - Never use \`any\`, unsafe type assertions, or silence errors
// - Do not silence errors — resolve them fully and correctly
// - Fix all errors in each file in one go
// - Reuse existing logic or types instead of re-creating similar ones
// - Do not submit partial updates; provide the full updated content of the file
//
// Output must be a **JSON array** only. Each item must include:
// - \`action\`: "update"
// - \`file\`: relative path to the updated file
// - \`description\`: "Fix console errors"
// - \`content\`: full new content of the file, as a string
//
// Do not include explanations, markdown, or code blocks.
// `;
//   let fixupPlan: Fix[] = [];
//   try {
//     fixupPlan = JSON.parse(extractJsonArray(await callAI(fixupPrompt))) as Fix[];
//   } catch (e) {
//     console.error('Could not parse visual fixup plan from LLM:', e instanceof Error ? e.message : String(e));
//   }
//
//   console.log('Fixup plan has', fixupPlan.length, 'items');
//   await applyFixes(fixupPlan, projectDir);
//   await closeBrowser();
//   return true;
// }

async function fixErrorsLoop(ctx: ProjectContext, projectDir: string) {
  const maxIterations = 5;
  debugErrors('Starting error fix loop, max iterations: %d', maxIterations);

  for (let i = 0; i < maxIterations; ++i) {
    debugErrors('Error fix iteration %d/%d', i + 1, maxIterations);

    if (await fixTsErrors(ctx, projectDir)) {
      debugErrors('Fixed TypeScript errors, continuing to next iteration');
      continue;
    }

    if (await fixBuildErrors(ctx, projectDir)) {
      debugErrors('Fixed build errors, continuing to next iteration');
      continue;
    }

    if (await fixConsoleErrors(ctx, projectDir)) {
      debugErrors('Fixed console errors, continuing to next iteration');
      continue;
    }

    debugErrors('No errors found, exiting fix loop at iteration %d', i + 1);
    break;
  }

  debugErrors('Error fix loop complete');
}

export async function runAIAgent(projectDir: string, iaSchemeDir: string, designSystemPath: string) {
  debug('='.repeat(80));
  debug('Starting AI agent');
  debug('Project directory: %s', projectDir);
  debug('IA scheme directory: %s', iaSchemeDir);
  debug('Design system path: %s', designSystemPath);
  debug('='.repeat(80));

  const userPreferencesFile = path.join(projectDir, 'design-system-principles.md');
  debug('Loading user preferences from: %s', userPreferencesFile);
  const userPreferences = await fs.readFile(userPreferencesFile, 'utf-8');
  debug('User preferences loaded, size: %d bytes', userPreferences.length);

  debug('Loading design system from: %s', designSystemPath);
  const designSystem = await fs.readFile(designSystemPath, 'utf-8');
  debug('Design system loaded, size: %d bytes', designSystem.length);

  debug('Building project context...');
  const ctx = await getProjectContext(projectDir, iaSchemeDir, userPreferences, designSystem);
  debug('Project context created successfully');

  debug('Planning project implementation...');
  const plan = await planProject(ctx);
  debugPlan('Generated plan with %d items', plan.length);

  debug('Applying implementation plan...');
  await applyPlan(plan, ctx, projectDir);
  debug('Plan applied successfully');

  debug('Starting error correction phase...');
  await fixErrorsLoop(ctx, projectDir);
  debug('Error fixing loop completed');

  debug('Generating visual error report...');
  await reportVisualErrors(ctx);
  debug('Visual errors reported');

  debug('Cleaning up resources...');
  await closeBrowser();
  debug('Browser closed');

  debug('='.repeat(80));
  console.log('AI project implementation complete!');
  debug('AI agent completed successfully');
  debug('='.repeat(80));
}
