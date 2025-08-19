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

// Utility to extract props from interface
function extractPropsFromInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
): { name: string; type: string }[] {
  return node.members.filter(ts.isPropertySignature).map((member) => {
    const name = member.name.getText(sourceFile);
    const type = member.type ? member.type.getText(sourceFile) : 'any';
    return { name, type };
  });
}

// Utility to extract props from type alias
function extractPropsFromTypeAlias(
  node: ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
): { name: string; type: string }[] {
  if (!ts.isTypeLiteralNode(node.type)) return [];
  return node.type.members.filter(ts.isPropertySignature).map((member) => {
    const name = member.name.getText(sourceFile);
    const type = member.type ? member.type.getText(sourceFile) : 'any';
    return { name, type };
  });
}

// Extract atoms and their props from src/components/atoms
async function getAtomsWithProps(
  projectDir: string,
): Promise<{ name: string; props: { name: string; type: string }[] }[]> {
  const atomsDir = path.join(projectDir, 'src/components/atoms');
  let files: string[] = [];
  try {
    files = (await fs.readdir(atomsDir)).filter((f) => f.endsWith('.tsx'));
  } catch {
    return [];
  }
  const atoms: { name: string; props: { name: string; type: string }[] }[] = [];
  for (const file of files) {
    const filePath = path.join(atomsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    let componentName = file.replace(/\.tsx$/, '');
    componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
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
  }
  return atoms;
}

const provider = AIProvider.Anthropic;

function extractJsonArray(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) return codeBlockMatch[1].trim();
  const arrayMatch = text.match(/(\[[\s\S]*\])/);
  if (arrayMatch) return arrayMatch[0];
  return text;
}

async function callAI(prompt: string, options?: { temperature?: number; maxTokens?: number }) {
  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? 4000;
  return (await generateTextWithAI(prompt, provider, { temperature, maxTokens })).trim();
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

async function loadScheme(iaSchemeDir: string): Promise<Scheme | undefined> {
  try {
    return JSON.parse(await fs.readFile(path.join(iaSchemeDir, 'auto-ia-scheme.json'), 'utf-8')) as Scheme;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code !== 'ENOENT') {
      throw err;
    }
    return undefined;
  }
}

async function getGraphqlOperations(projectDir: string, files: string[]): Promise<Record<string, string>> {
  const graphqlFiles = files.filter((f) => f.startsWith('src/graphql/') && f.endsWith('.ts'));
  const operations: Record<string, string> = {};
  for (const filePath of graphqlFiles) {
    try {
      const content = await fs.readFile(path.join(projectDir, filePath), 'utf-8');
      operations[path.basename(filePath, '.ts')] = content;
    } catch (error) {
      console.error(`Error reading GraphQL operations file ${filePath}:`, error);
    }
  }
  return operations;
}

async function getKeyFileContents(projectDir: string, files: string[]): Promise<Record<string, string>> {
  const keyFiles = files.filter((f) => ['src/index.css', 'src/globals.css'].includes(f));
  const contents: Record<string, string> = {};
  for (const file of keyFiles) {
    try {
      contents[file] = await fs.readFile(path.join(projectDir, file), 'utf-8');
    } catch {
      // ignore
    }
  }
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
  try {
    const themeMatch = designSystem.match(/## Theme\s*\n([\s\S]*?)(?=\n## |\n# |\n*$)/);
    return themeMatch && themeMatch[1] ? themeMatch[1].trim() : '';
  } catch (error) {
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
  const files = await listFiles(projectDir);
  const [scheme, atoms, graphqlOperations, keyFileContents, theme] = await Promise.all([
    loadScheme(iaSchemeDir),
    getAtomsWithProps(projectDir),
    getGraphqlOperations(projectDir, files),
    getKeyFileContents(projectDir, files),
    getTheme(designSystem),
  ]);
  const fileTreeSummary = getFileTreeSummary(files, atoms);

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
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === 'node_modules') return [];

      const res = path.resolve(dir, entry.name);

      if (entry.isDirectory()) {
        return listFiles(res, base);
      } else {
        return [path.relative(base, res)];
      }
    }),
  );

  return files.flat();
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
  const prompt = makeBasePrompt(ctx);
  const planText = await callAI(prompt);
  try {
    return JSON.parse(extractJsonArray(planText)) as Change[];
  } catch {
    console.error('Could not parse plan from LLM:', planText);
    return [];
  }
}

async function applyPlan(plan: Change[], ctx: ProjectContext, projectDir: string) {
  for (const change of plan) {
    let fileContent = '';
    if (change.action === 'update') {
      try {
        fileContent = await fs.readFile(path.join(projectDir, change.file), 'utf-8');
      } catch {
        // ignore
      }
    }
    const codePrompt = `${makeBasePrompt(ctx)}\nHere is the planned change:\n${JSON.stringify(change, null, 2)}\n${
      change.action === 'update' ? `Here is the current content of ${change.file}:\n${fileContent}\n` : ''
    }Please output ONLY the full new code for the file (no markdown, no triple backticks, just code, ready to write to disk).`;
    const code = await callAI(codePrompt);
    const outPath = path.join(projectDir, change.file);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, code, 'utf-8');
    console.log(`${change.action === 'update' ? 'Updated' : 'Created'} ${change.file}`);
  }
}

interface Fix {
  action: 'update';
  file: string;
  description: string;
  content: string;
}

async function fixTsErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  const tsErrors = await getTsErrors(projectDir);
  console.log('Found', tsErrors.length, 'TypeScript errors');
  if (tsErrors.length === 0) return false;

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
  } catch (e) {
    console.error('Could not parse TS fixup plan from LLM:', e instanceof Error ? e.message : String(e));
  }
  console.log('Fixup plan has', fixupPlan.length, 'items');
  for (const fix of fixupPlan) {
    if (fix.action === 'update' && fix.file && fix.content) {
      const outPath = path.join(projectDir, fix.file);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, fix.content, 'utf-8');
      console.log(`Fixed TS errors in ${fix.file}`);
    }
  }
  return true;
}

async function fixBuildErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  const buildErrors = await getBuildErrors(projectDir);
  console.log('Found', buildErrors.length, 'build errors');
  if (buildErrors.length === 0) return false;

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
  } catch (e) {
    console.error('Could not parse build fixup plan from LLM:', e instanceof Error ? e.message : String(e));
  }
  console.log('Fixup plan has', fixupPlan.length, 'items');
  for (const fix of fixupPlan) {
    if (fix.action === 'update' && fix.file && fix.content) {
      const outPath = path.join(projectDir, fix.file);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, fix.content, 'utf-8');
      console.log(`Fixed build errors in ${fix.file}`);
    }
  }
  return true;
}

// Helper to extract all page routes from the IA scheme
function extractPageRoutesFromScheme(scheme: Scheme | undefined): string[] {
  if (scheme?.pages?.items && typeof scheme.pages.items === 'object') {
    return Object.values(scheme.pages.items)
      .map((page) =>
        typeof page === 'object' && 'route' in page && typeof page.route === 'string' ? page.route : undefined,
      )
      .filter((route): route is string => typeof route === 'string');
  }
  return [];
}

async function checkRouteErrors(baseUrl: string, routes: string[]): Promise<string[]> {
  const allConsoleErrors: string[] = [];
  for (const route of routes) {
    const url = baseUrl + (route.startsWith('/') ? route : '/' + route);
    console.log(`Checking console errors for ${url}`);
    const errors = await getConsoleErrors(url);
    if (Array.isArray(errors) && errors.length > 0) {
      allConsoleErrors.push(...errors.map((e: string) => `[${route}] ${e}`));
    }
  }
  return allConsoleErrors;
}

async function applyFixes(fixupPlan: Fix[], projectDir: string): Promise<void> {
  for (const fix of fixupPlan) {
    if (fix.action !== 'update' || !fix.file || !fix.content) continue;
    const outPath = path.join(projectDir, fix.file);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, fix.content, 'utf-8');
    console.log(`Fixed errors in ${fix.file}`);
  }
}

async function fixConsoleErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  const baseUrl = 'http://localhost:8080';
  let routes = extractPageRoutesFromScheme(ctx.scheme);
  if (routes.length === 0) {
    routes = ['/'];
  }

  const allConsoleErrors = await checkRouteErrors(baseUrl, routes);
  console.log('Found', allConsoleErrors.length, 'console errors');
  if (allConsoleErrors.length === 0) {
    await closeBrowser();
    return false;
  }

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
    fixupPlan = JSON.parse(extractJsonArray(await callAI(fixupPrompt))) as Fix[];
  } catch (e) {
    console.error('Could not parse console fixup plan from LLM:', e instanceof Error ? e.message : String(e));
  }

  console.log('Fixup plan has', fixupPlan.length, 'items');
  await applyFixes(fixupPlan, projectDir);
  await closeBrowser();
  return true;
}

async function checkVisualErrors(baseUrl: string, routes: string[], theme: string): Promise<string> {
  const screenshots = await getPageScreenshots(baseUrl, routes);

  let allVisualErrors: string = '';
  for (const screenshot of screenshots) {
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
      allVisualErrors += error;
    }
  }
  return allVisualErrors;
}

async function getPageScreenshots(baseUrl: string, routes: string[]): Promise<{ route: string; screenshot: string }[]> {
  const pageScreenshots: { route: string; screenshot: string }[] = [];
  for (const route of routes) {
    const url = baseUrl + (route.startsWith('/') ? route : '/' + route);
    console.log(`Taking screenshot for ${url}`);
    const screenshot = await getPageScreenshot(url);
    if (screenshot) {
      pageScreenshots.push({
        route: route,
        screenshot: screenshot,
      });
    }
  }
  await closeBrowser();
  return pageScreenshots;
}

async function reportVisualErrors(ctx: ProjectContext): Promise<void> {
  const baseUrl = 'http://localhost:8080';
  let routes = extractPageRoutesFromScheme(ctx.scheme);
  if (routes.length === 0) {
    routes = ['/'];
  }

  const allVisualErrors = await checkVisualErrors(baseUrl, routes, ctx.theme);
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
  for (let i = 0; i < maxIterations; ++i) {
    if (await fixTsErrors(ctx, projectDir)) continue;
    if (await fixBuildErrors(ctx, projectDir)) continue;
    if (await fixConsoleErrors(ctx, projectDir)) continue;
    break;
  }
}

export async function runAIAgent(
  projectDir: string,
  iaSchemeDir: string,
  userPreferencesPath: string,
  designSystemPath: string,
) {
  const userPreferences = await fs.readFile(path.join(projectDir, 'design-system-principles.md'), 'utf-8');
  const designSystem = await fs.readFile(path.join(__dirname, designSystemPath), 'utf-8');
  const ctx = await getProjectContext(projectDir, iaSchemeDir, userPreferences, designSystem);
  const plan = await planProject(ctx);
  await applyPlan(plan, ctx, projectDir);
  await fixErrorsLoop(ctx, projectDir);
  await reportVisualErrors(ctx);
  console.log('AI project implementation complete!');
}
