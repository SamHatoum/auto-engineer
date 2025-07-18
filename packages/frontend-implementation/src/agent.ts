import { generateTextWithAI, AIProvider } from '@auto-engineer/ai-gateway';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getTsErrors, getBuildErrors, getConsoleErrors, closeBrowser } from '@auto-engineer/frontend-checks';
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

interface ProjectContext {
  scheme: unknown;
  files: string[];
  atoms: { name: string; props: { name: string; type: string }[] }[];
  keyFileContents: Record<string, string>;
  fileTreeSummary: string[];
  graphqlOperations: Record<string, string>;
  userPreferences: string;
}

async function getProjectContext(
  projectDir: string,
  iaSchemeDir: string,
  userPreferences: string,
): Promise<ProjectContext> {
  const schemePath = iaSchemeDir;
  let scheme: unknown = undefined;
  try {
    scheme = JSON.parse(await fs.readFile(schemePath, 'utf-8')) as unknown;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code !== 'ENOENT') {
      throw err;
    }
    // If file does not exist, just continue with scheme as undefined
  }
  const files = await listFiles(projectDir);
  const atoms = await getAtomsWithProps(projectDir);
  const graphqlOperationsFilesPath = files.filter((f) => f.startsWith('src/graphql/') && f.endsWith('.ts'));
  const graphqlOperations: Record<string, string> = {};
  for (const filePath of graphqlOperationsFilesPath) {
    try {
      const content = await fs.readFile(path.join(projectDir, filePath), 'utf-8');
      const operation = path.basename(filePath, 'ts');
      graphqlOperations[operation] = content;
    } catch (error) {
      console.error(`Error reading GraphQL operations file ${filePath}:`, error);
    }
  }

  const keyFiles = files.filter((f) => ['src/index.css', 'src/globals.css'].includes(f));
  const keyFileContents: Record<string, string> = {};
  for (const file of keyFiles) {
    try {
      keyFileContents[file] = await fs.readFile(path.join(projectDir, file), 'utf-8');
    } catch {
      // ignore
    }
  }
  const fileTreeSummary = [
    ...files.filter(
      (f) =>
        f.startsWith('src/pages/') ||
        f.startsWith('src/hooks/') ||
        f.startsWith('src/lib/') ||
        ['src/App.tsx', 'src/routes.tsx', 'src/main.tsx'].includes(f),
    ),
    `src/components/atoms/ (atoms: ${atoms.map((a) => a.name).join(', ')})`,
  ];
  return {
    scheme,
    files,
    atoms,
    keyFileContents,
    fileTreeSummary,
    graphqlOperations,
    userPreferences,
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
You are Auto, an expert AI frontend engineer specializing in scalable, clean, production-grade React applications using modern TypeScript, TailwindCSS, and GraphQL via Apollo Client.

Your task: Analyze the current project and generate a complete plan to implement a well-structured, schema-compliant React app using atomic design and integrated GraphQL operations. You must ensure code clarity, maintainability, and adherence to project styling conventions.

User Preferences: ${ctx.userPreferences}

Component Design & Structure:
- Follow atomic design:
  - Build molecules → organisms → pages
  - Then update routing in \`App.tsx\` accordingly. **DO NOT FORGET THIS.**
- Only create pages that are explicitly listed in \`auto-ia-scheme.json\`. No extra routes.
- Reuse atoms/molecules/organisms when possible. Only create new components when absolutely required.
- Use responsive layout by default.
- Use a consistent spacing scale (4/8/12/16px).
- Component files must stay under 50 lines when possible.
- All components must be typed. Use the format \`<ComponentName>Props\`.

Component Responsibilities:
- Components must not include generic or redundant headings to represent structure.
- Page-level wrappers must **not** introduce headings unless absolutely necessary.
- Use semantic structure, branded color tokens, spacing, and layout to indicate purpose.

Styling & UI Conventions:
- Use **Tailwind CSS utility classes** exclusively.
- Never hardcode colors — use only theme tokens defined in \`src/globals.css\`.
- Follow **shadcn best practices**:
  - Use variant tokens like \`default\`, \`destructive\`, \`outline\`, etc.
  - Use branded \`primary\` colors consistently across CTA buttons, cards, and highlights.
  - Avoid overwriting shadcn component styles unless extending properly.

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
    const codePrompt = `${makeBasePrompt(ctx)}\nHere is the planned change:\n${JSON.stringify(change, null, 2)}\n${change.action === 'update' ? `Here is the current content of ${change.file}:\n${fileContent}\n` : ''
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
  console.log('Found ts errors', tsErrors);
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
    // console.debug('Could not parse TS fixup plan from LLM:', fixupPlanText, e);
  }
  console.log('Fixup plan', fixupPlan);
  for (const fix of fixupPlan) {
    if (fix.action === 'update' && fix.file && fix.content) {
      const outPath = path.join(projectDir, fix.file);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, fix.content, 'utf-8');
      console.log(`Fixed ${fix.file} for TS errors`);
    }
  }
  return true;
}

async function fixBuildErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  const buildErrors = await getBuildErrors(projectDir);
  console.log('Found build errors', buildErrors);
  if (buildErrors.length === 0) return false;

  const errorFeedback = buildErrors.join('\n');
  const fixupPrompt = `${makeBasePrompt(ctx)}\n
After your previous changes, the application produced the following Vite build errors:\n\n${errorFeedback}\n
You must now fix **every** error listed above. This is a critical pass: if any error remains after your fix, your output is rejected.

Strict rules:
- Do not silence errors — resolve them fully and correctly
- Fix all errors in each file in one go
- Reuse existing logic or types instead of re-creating similar ones
- Do not submit partial updates; provide the full updated content of the file

Output must be a **JSON array** only. Each item must include:
- \`action\`: "update"
- \`file\`: relative path to the updated file
- \`description\`: "Fix Vite build errors"
- \`content\`: full new content of the file, as a string

Do not include explanations, markdown, or code blocks.
`;
  const fixupPlanText = await callAI(fixupPrompt);
  let fixupPlan: Fix[] = [];
  try {
    fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)) as Fix[];
  } catch (e) {
    await closeBrowser?.();
    console.error('Could not parse Vite build fixup plan from LLM:', e instanceof Error ? e.message : String(e));
    // console.debug('Could not parse Vite build fixup plan from LLM:', fixupPlanText, e);
  }
  console.log('Fixup plan', fixupPlan);
  for (const fix of fixupPlan) {
    if (fix.action === 'update' && fix.file && fix.content) {
      const outPath = path.join(projectDir, fix.file);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, fix.content, 'utf-8');
      console.log(`Fixed ${fix.file} for Vite build errors`);
    }
  }
  return true;
}

async function fixConsoleErrors(ctx: ProjectContext, projectDir: string): Promise<boolean> {
  const consoleErrors = await getConsoleErrors("http://localhost:8081");
  console.log('Found console errors', consoleErrors);
  if (consoleErrors.length === 0) return false;

  const errorFeedback = consoleErrors.join("\n");
  const fixupPrompt = `${makeBasePrompt(ctx)}\n
After your previous changes, the application produced the following console errors when running:\n\n${errorFeedback}\n
You must now fix **every** error listed above. This is a critical pass: if any error remains after your fix, your output is rejected.

Strict rules:
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
  const fixupPlanText = await callAI(fixupPrompt);
  let fixupPlan: Fix[] = [];
  try {
    fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)) as Fix[];
  } catch (e) {
    await closeBrowser();
    console.error("Could not parse fixup plan from LLM:", e instanceof Error ? e.message : String(e));
    // console.debug('Could not parse fixup plan from LLM:', fixupPlanText, e);
  }
  console.log('Fixup plan', fixupPlan);
  for (const fix of fixupPlan) {
    if (fix.action === 'update' && fix.file && fix.content) {
      const outPath = path.join(projectDir, fix.file);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, fix.content, "utf-8");
      console.log(`Fixed ${fix.file} for console errors`);
    }
  }
  await closeBrowser();
  return true;
}

async function fixErrorsLoop(ctx: ProjectContext, projectDir: string) {
  const maxIterations = 5;
  for (let i = 0; i < maxIterations; ++i) {
    if (await fixTsErrors(ctx, projectDir)) continue;
    if (await fixBuildErrors(ctx, projectDir)) continue;
    // if (await fixConsoleErrors(ctx, projectDir)) continue;
    break;
  }
}

// async function fixConsoleErrors(ctx: ProjectContext, projectDir: string) {
//   const consoleErrors = await getConsoleErrors("http://localhost:8081");
//   if (consoleErrors.length > 0) {
//     const errorFeedback = consoleErrors.join("\n");
//     const fixupPrompt = `${makeBasePrompt(ctx)}\nAfter your previous changes, the application produced the following console errors when running:\n\n${errorFeedback}\n\nPlease provide the necessary code changes to fix these errors. You can choose to update one or more files.\nOutput a JSON array of planned changes, each with:\n  - action: "update"\n  - file: relative file path\n  - description: "Fix console errors"\n  - content: the full new code for the file\n\nRespond with only a JSON array, no explanation, no markdown, no code block.`;
//     const fixupPlanText = await callAI(fixupPrompt);
//     let fixupPlan: Fix[] = [];
//     try {
//       fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)) as Fix[];
//     } catch {
//       console.error("Could not parse fixup plan from LLM:", fixupPlanText);
//     }
//     for (const fix of fixupPlan) {
//       if (fix.action === 'update' && fix.file && fix.content) {
//         const outPath = path.join(projectDir, fix.file);
//         await fs.mkdir(path.dirname(outPath), { recursive: true });
//         await fs.writeFile(outPath, fix.content, "utf-8");
//         console.log(`Fixed ${fix.file}`);
//       }
//     }
//   }
// }

export async function runAIAgent(projectDir: string, iaSchemeDir: string, userPreferencesPath: string) {
  const userPreferences = await fs.readFile(path.join(__dirname, userPreferencesPath), 'utf-8');
  const ctx = await getProjectContext(projectDir, iaSchemeDir, userPreferences);
  const plan = await planProject(ctx);
  await applyPlan(plan, ctx, projectDir);
  await fixErrorsLoop(ctx, projectDir);
  console.log('AI project implementation complete!');
}
