import { generateTextWithAI, AIProvider } from "@auto-engineer/ai-integration";
import * as fs from "fs/promises";
import * as path from "path";
import { getConsoleErrors, closeBrowser, getTsErrors, getBuildErrors } from "@auto-engineer/ui-checks";

const provider = 'anthropic' as AIProvider;

function extractJsonArray(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) return codeBlockMatch[1].trim();
  const arrayMatch = text.match(/(\[[\s\S]*\])/);
  if (arrayMatch) return arrayMatch[0];
  return text;
}

async function callAI(prompt: string, options?: { temperature?: number, maxTokens?: number }) {
  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? 4000;
  return (await generateTextWithAI(prompt, provider, { temperature, maxTokens })).trim();
}

async function getProjectContext(projectDir: string) {
  const schemePath = path.join(projectDir, "auto-ia-scheme.json");
  const scheme = JSON.parse(await fs.readFile(schemePath, "utf-8"));
  const files = await listFiles(projectDir);
  const shadcnComponents = files.filter(f => f.startsWith("src/components/elements/") && f.endsWith(".tsx")).map(f => path.basename(f, ".tsx"));
  const keyFiles = files.filter(f => f.startsWith("src/pages/") || ["src/App.tsx", "src/routes.tsx", "src/main.tsx"].includes(f));
  const keyFileContents: Record<string, string> = {};
  for (const file of keyFiles) {
    try { keyFileContents[file] = await fs.readFile(path.join(projectDir, file), "utf-8"); } catch { }
  }
  const fileTreeSummary = [
    ...files.filter(f => f.startsWith("src/pages/") || ["src/App.tsx", "src/routes.tsx", "src/main.tsx"].includes(f)),
    `src/components/elements/ (shadcn components: ${shadcnComponents.join(", ")})`
  ];
  return { scheme, files, shadcnComponents, keyFileContents, fileTreeSummary };
}

async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) return listFiles(res, base);
    else return [path.relative(base, res)];
  }));
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


function makeBasePrompt(ctx: ReturnType<typeof getProjectContext> extends Promise<infer T> ? T : never) {
  return `You are Auto, an AI software engineer that helps users build web applications.

Your job: Plan and implement all necessary changes to make the project match the schema
- Make the app look beautiful, and do some basic branding work to feel like a unique app across pages
- Reuse existing components where possible (especially shadcn components in src/components/elements, which you can treat as standard shadcn components, other components are located under src/components/modules and src/components/sections, always check if they exist first before creating).
- Only create new files if they do not exist.
- Update routing and navigation as needed.
- only import as relative path and named imports, and make sure to always use named exports when creating new files
- Output a JSON array of planned changes, each with:
  - action: "create" | "update"
  - file: relative file path
  - description: what/why

Respond with only a JSON array, no explanation, no markdown, no code block.

Here is a summary of the file tree:
${JSON.stringify(ctx.fileTreeSummary, null, 2)}

Here are the names of all available shadcn UI components:
${JSON.stringify(ctx.shadcnComponents, null, 2)}

Here are the contents of key files:
${Object.entries(ctx.keyFileContents).map(([f, c]) => `--- ${f} ---\n${c}\n`).join("\n")}

Here is the content of auto-ia-scheme.json:
${JSON.stringify(ctx.scheme, null, 2)}
`;
}

async function planProject(ctx: any) {
  const prompt = makeBasePrompt(ctx);
  const planText = await callAI(prompt);
  try {
    return JSON.parse(extractJsonArray(planText));
  } catch {
    console.error("Could not parse plan from LLM:", planText);
    return [];
  }
}

async function applyPlan(plan: any[], ctx: any, projectDir: string) {
  for (const change of plan) {
    let fileContent = '';
    if (change.action === 'update') {
      try { fileContent = await fs.readFile(path.join(projectDir, change.file), "utf-8"); } catch { }
    }
    const codePrompt = `${makeBasePrompt(ctx)}\nHere is the planned change:\n${JSON.stringify(change, null, 2)}\n${change.action === 'update' ? `Here is the current content of ${change.file}:\n${fileContent}\n` : ''}Please output ONLY the full new code for the file (no markdown, no triple backticks, just code, ready to write to disk).`;
    const code = await callAI(codePrompt);
    const outPath = path.join(projectDir, change.file);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, code, "utf-8");
    console.log(`${change.action === 'update' ? 'Updated' : 'Created'} ${change.file}`);
  }
}

async function fixErrorsLoop(ctx: any, projectDir: string) {
  let maxIterations = 5;
  for (let i = 0; i < maxIterations; ++i) {
    const tsErrors = await getTsErrors(projectDir);
    if (tsErrors.length) {
      const errorDetails: Array<{
        file: string;
        line: number;
        message: string;
      }> = tsErrors.map(line => {
        // Example error: src/components/Foo.tsx(42,13): error TS2345: ...
        const match = line.match(/([^\s\(\)]+\.tsx?)\((\d+),\d+\): (.+)/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2], 10),
            message: match[3].trim(),
          };
        }
        // fallback: try to extract file and message
        const fallback = line.match(/([^\s\(\)]+\.tsx?): (.+)/);
        return {
          file: fallback ? fallback[1] : 'unknown',
          line: 1,
          message: fallback ? fallback[2].trim() : line,
        };
      }).filter(e => e.file !== 'unknown');

      for (const error of errorDetails) {
        const filePath = path.join(projectDir, error.file);
        let fileLines: string[] = [];
        try {
          const fileContent = await fs.readFile(filePath, "utf-8");
          fileLines = fileContent.split("\n");
        } catch { }
        // Get the error line and optionally one before/after for context
        const idx = error.line - 1;
        const contextLines = [
          fileLines[idx - 1] || '',
          fileLines[idx] || '',
          fileLines[idx + 1] || ''
        ];
        const contextStr = contextLines.map((l, i) => `Line ${error.line - 1 + i}:\n${l}`).join("\n");
        const fixupPrompt = `File: ${error.file}\n${contextStr}\n\nTypeScript Error:\n${error.message}\n\nPlease suggest a fix for Line ${error.line} only. Respond with the corrected line of code, no explanation, no markdown.`;
        const fix = await callAI(fixupPrompt);
        if (fix && fileLines[idx] !== undefined) {
          fileLines[idx] = fix.trim();
          await fs.writeFile(filePath, fileLines.join("\n"), "utf-8");
          console.log(`Fixed ${error.file} line ${error.line}`);
        }
      }
      continue;
    }
    const buildErrors = await getBuildErrors(projectDir);
    if (buildErrors.length) {
      const errorFeedback = buildErrors.join("\n");
      const fixupPrompt = `${makeBasePrompt(ctx)}\nAfter your previous changes, the application produced the following Vite build errors:\n\n${errorFeedback}\n\nPlease provide the necessary code changes to fix these errors. This might involve adding missing dependencies to package.json or correcting import paths.\nOutput a JSON array of planned changes, each with:\n  - action: \"update\"\n  - file: relative file path\n  - description: \"Fix Vite build errors\"\n  - content: the full new code for the file\n\nRespond with only a JSON array, no explanation, no markdown, no code block.`;
      const fixupPlanText = await callAI(fixupPrompt);
      let fixupPlan: { action: string, file: string, content: string }[] = [];
      try { fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)); } catch { console.error("Could not parse Vite build fixup plan from LLM:", fixupPlanText); }
      for (const fix of fixupPlan) {
        if (fix.action === 'update' && fix.file && fix.content) {
          const outPath = path.join(projectDir, fix.file);
          await fs.mkdir(path.dirname(outPath), { recursive: true });
          await fs.writeFile(outPath, fix.content, "utf-8");
          console.log(`Fixed ${fix.file} for Vite build errors`);
        }
      }
      continue;
    }
    break;
  }
}

async function fixConsoleErrors(ctx: any, projectDir: string) {
  const consoleErrors = await getConsoleErrors("http://localhost:8081");
  if (consoleErrors.length) {
    const errorFeedback = consoleErrors.join("\n");
    const fixupPrompt = `${makeBasePrompt(ctx)}\nAfter your previous changes, the application produced the following console errors when running:\n\n${errorFeedback}\n\nPlease provide the necessary code changes to fix these errors. You can choose to update one or more files.\nOutput a JSON array of planned changes, each with:\n  - action: \"update\"\n  - file: relative file path\n  - description: \"Fix console errors\"\n  - content: the full new code for the file\n\nRespond with only a JSON array, no explanation, no markdown, no code block.`;
    const fixupPlanText = await callAI(fixupPrompt);
    let fixupPlan: { action: string, file: string, description: string, content: string }[] = [];
    try { fixupPlan = JSON.parse(extractJsonArray(fixupPlanText)); } catch { console.error("Could not parse fixup plan from LLM:", fixupPlanText); }
    for (const fix of fixupPlan) {
      if (fix.action === 'update' && fix.file && fix.content) {
        const outPath = path.join(projectDir, fix.file);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, fix.content, "utf-8");
        console.log(`Fixed ${fix.file}`);
      }
    }
  }
}

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