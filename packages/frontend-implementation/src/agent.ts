import { generateTextWithAI, AIProvider } from '@auto-engineer/ai-integration';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getTsErrors, getBuildErrors } from '@auto-engineer/ui-checks';
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
  shadcnComponents: string[];
  keyFileContents: Record<string, string>;
  fileTreeSummary: string[];
  graphqlOperations: Record<string, string>;
}

async function getProjectContext(projectDir: string): Promise<ProjectContext> {
  const schemePath = path.join(projectDir, 'auto-ia-scheme.json');
  const scheme = JSON.parse(await fs.readFile(schemePath, 'utf-8')) as unknown;
  const files = await listFiles(projectDir);
  const shadcnComponents = files
    .filter((f) => f.startsWith('src/components/atoms/') && f.endsWith('.tsx'))
    .map((f) => path.basename(f, '.tsx'));
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

  const keyFiles = files.filter(
    (f) => f.startsWith('src/pages/') || ['src/App.tsx', 'src/routes.tsx', 'src/main.tsx'].includes(f),
  );
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
    `src/components/atoms/ (shadcn components: ${shadcnComponents.join(', ')})`,
  ];
  return {
    scheme,
    files,
    shadcnComponents,
    keyFileContents,
    fileTreeSummary,
    graphqlOperations,
  };
}

async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) return listFiles(res, base);
      else return [path.relative(base, res)];
    }),
  );
  return files.flat();
}

// What I want to build:
//   Guest books a listing:
//   - Search for available listings (get)
//     - should have location filter
//     - should have price range slider
//     - should have guest count filter
//   - Host is notified

//   Host creates a listing:
//   - Create listing (post)
//     - should have fields for title, description, location, address
//     - should have price per night input
//     - should have max guests selector
//     - should have amenities checklist
function makeBasePrompt(ctx: ProjectContext): string {
  const keyFileContents = Object.entries(ctx.keyFileContents)
    .map(([f, c]) => `--- ${f} ---\n${c}\n`)
    .join('\n');

  const graphqlDescriptions = Object.entries(ctx.graphqlOperations)
    .map(([f, c]) => `--- ${f} ---\n${c}\n`)
    .join('\n');

  return `
You are Auto, an expert AI frontend engineer specializing in building visually stunning, top-tier, production-quality web applications that match the polish and UX of the world’s best-designed apps. You use modern React and TypeScript best practices and deliver clean, scalable, and thoughtfully architected frontend code.

Your task: Analyze the current project and make a complete plan to transform it into a beautifully designed, well-structured, schema-compliant React application with fully integrated GraphQL operations using Apollo Client. You must ensure styling consistency and code clarity throughout the application.

Design & UI Guidelines (High Priority):
You must prioritize design excellence, visual polish, and emotional impact. Treat every component and screen as if it were going into a production-grade product used by thousands of users.

Use the visual and UX standards of the top 1% of modern web applications as your benchmark — including apps like Airbnb, Stripe, Linear, Superhuman, Notion, and Vercel. Emulate their:
- Visual clarity and brand alignment
- Use of spacing, typography, layout rhythm, and contrast
- Smooth interaction feedback (hover, loading, errors)
- Mobile responsiveness and layout adaptability
- Visual hierarchy and attention to detail
- Emotional tone and design maturity

Evaluate the app’s intent and domain by analyzing its name, schema, component structure, layout, and user flows — and apply an appropriate design tone (e.g., minimalist, luxurious, fun, business-grade). Choose visuals, colors, typography, and motion to reflect this tone naturally.

Do not rely on templates. Instead, produce a result that feels bespoke, intentional, and polished, as if it was the product of an elite design team.

🎨 General Visual Principles:
- Modular layout using card-based or section-based design
- Generous whitespace and consistent vertical rhythm
- Clear typographic hierarchy with logical font sizing and spacing
- Responsive, mobile-first layout with adaptive grids
- Subtle microinteractions (hover, focus, loading, error, empty, active)
- Smooth, context-appropriate transitions (e.g. fade/scale for expressive UIs, minimal transitions for dashboards)
- Visual feedback for all interaction states

Design and Implementation Rules:
- All components must be responsive by default.
- Use a consistent spacing system (e.g., 4/8/12/16px scale).
- Apply atomic design (atoms → molecules → organisms → pages).
- Component size should stay under 50 lines where possible.
- Use Tailwind CSS utility classes for layout, color, and spacing. Avoid raw CSS unless absolutely necessary.
- Use toast notifications for all critical user feedback (error, success, validation).
- Add console logs to trace state transitions and key application events.
- Ensure full accessibility: semantic HTML, keyboard navigation, ARIA roles, and visible focus states.
- Avoid layout jitter: all async/dynamic rendering must use stable containers.
- Optimize all images and use appropriate loading strategies.
- Never use inline styles — always use Tailwind or utility class abstractions.

Component Architecture Guidelines:
- Reuse components where possible:
  - Treat components in \`src/components/atoms\` as [shadcn/ui](https://ui.shadcn.com) primitives.
  - Prefer existing \`molecules\` or \`organisms\` before introducing new components.
  - Only create new components when no reusable equivalent exists.
- Every component must reside in its own file.
- File names must be consistent across the codebase, using either PascalCase or kebab-case as defined in the existing structure.
- Component names must not conflict with TypeScript built-in/global types.
- When typing component props, always use the format \`<ComponentName>Props\`. For example: \`BookingCardProps\`, \`SearchFormProps\`.

GraphQL Integration Guidelines:
- Use only GraphQL operations from \`src/graphql/queries.ts\` and \`src/graphql/mutations.ts\`.
- Use Apollo Client only: \`useQuery\`, \`useMutation\`, \`useLazyQuery\`.
- Do not use any other data-fetching libraries or client tools.
- GraphQL operations must only be used inside \`molecules\` or \`organisms\`. Never use them inside \`atoms\`.
- Do not modify the contents of the \`src/graphql/\` directory under any circumstances — these files are strictly read-only.
- If the structure of a GraphQL query doesn’t perfectly match the UI need, adapt the UI — do not rewrite the query.

Code & File Standards:
- Use TypeScript across the entire project.
- Use named exports and named imports only — default exports are not allowed.
- Use relative imports for all local/internal modules.
- Favor compositional and declarative coding patterns.
- Avoid prop drilling unless absolutely necessary — prefer context or prop co-location.
- Abstract and reuse shared logic, styles, and components to avoid duplication.
- Maintain a clean, modular folder structure aligned with atomic design principles.

GraphQL Restrictions:
You are not allowed to modify the following files under any circumstances:
- src/graphql/queries.ts
- src/graphql/mutations.ts

These files are read-only. You must work with the GraphQL operations defined in them exactly as they are. Do not create, delete, rename, or rewrite any GraphQL documents.

Output Specification:
Your output must be a JSON array of planned changes, where each item includes:
  - \`action\`: "create" | "update"
  - \`file\`: relative file path (from project root)
  - \`description\`: a short but clear explanation of what change will be made and why it’s necessary

Respond with only a JSON array. Do not include explanations, markdown, or code blocks.

Here is a summary of the file tree:
${JSON.stringify(ctx.fileTreeSummary, null, 2)}

Here are the names of all available shadcn UI components:
${JSON.stringify(ctx.shadcnComponents, null, 2)}

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
  if (tsErrors.length === 0) return false;

  const errorFeedback = tsErrors.join('\n');
  const fixupPrompt = `${makeBasePrompt(
    ctx,
  )}\nAfter your previous changes, the application produced the following TypeScript errors:\n\n${errorFeedback}\n\nYou must fix ALL errors in the list above. If there are multiple errors in a file, fix them all in one go.\nOutput a JSON array of planned changes, each with:\n  - action: "update"\n  - file: relative file path\n  - description: "Fix TypeScript errors"\n  - content: the full new code for the file\n\nRespond with only a JSON array, no explanation, no markdown, no code block.`;
  const fixupPlanText = await callAI(fixupPrompt);
  let fixupPlan: Fix[] = [];
  try {
    fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)) as Fix[];
  } catch {
    console.error('Could not parse TS fixup plan from LLM:', fixupPlanText);
  }
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
  if (buildErrors.length === 0) return false;

  const errorFeedback = buildErrors.join('\n');
  const fixupPrompt = `${makeBasePrompt(
    ctx,
  )}\nAfter your previous changes, the application produced the following Vite build errors:\n\n${errorFeedback}\n\nPlease provide the necessary code changes to fix these errors. This might involve adding missing dependencies to package.json or correcting import paths.\nOutput a JSON array of planned changes, each with:\n  - action: "update"\n  - file: relative file path\n  - description: "Fix Vite build errors"\n  - content: the full new code for the file\n\nRespond with only a JSON array, no explanation, no markdown, no code block.`;
  const fixupPlanText = await callAI(fixupPrompt);
  let fixupPlan: Fix[] = [];
  try {
    fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)) as Fix[];
  } catch {
    console.error('Could not parse Vite build fixup plan from LLM:', fixupPlanText);
  }
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

async function fixErrorsLoop(ctx: ProjectContext, projectDir: string) {
  const maxIterations = 5;
  for (let i = 0; i < maxIterations; ++i) {
    if (await fixTsErrors(ctx, projectDir)) continue;
    if (await fixBuildErrors(ctx, projectDir)) continue;
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

export async function runAIAgent(projectDir: string) {
  const ctx = await getProjectContext(projectDir);
  const plan = await planProject(ctx);
  await applyPlan(plan, ctx, projectDir);
  await fixErrorsLoop(ctx, projectDir);
  // await fixConsoleErrors(ctx, projectDir);
  // await closeBrowser();
  console.log('AI project implementation complete!');
}

// Example usage:
// pnpm --filter @auto-engineer/frontend-implementation ai-agent /absolute/path/to/your/react/project
