import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
dotenv.config();

// Helper to recursively list files in a directory
async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(res, base);
    } else {
      return [path.relative(base, res)];
    }
  }));
  return files.flat();
}

// Helper to read key files (excluding shadcn UI component contents)
async function readKeyFiles(projectDir: string, fileTree: string[]): Promise<{ keyFiles: Record<string, string>, shadcnComponents: string[] }> {
  const shadcnComponents = fileTree
    .filter(f => f.startsWith("src/components/ui/") && f.endsWith(".tsx"))
    .map(f => path.basename(f, ".tsx"));
  const keyFiles = fileTree.filter(f =>
    f.startsWith("src/pages/") ||
    f === "src/App.tsx" ||
    f === "src/routes.tsx" ||
    f === "src/main.tsx"
  );
  const result: Record<string, string> = {};
  for (const file of keyFiles) {
    try {
      result[file] = await fs.readFile(path.join(projectDir, file), "utf-8");
    } catch { }
  }
  return { keyFiles: result, shadcnComponents };
}

// Helper to extract JSON array from LLM response
function extractJsonArray(text: string): string {
  const match = text.match(/\[\s*{[\s\S]*?}\s*\]/);
  return match ? match[0] : text;
}

export async function runAIAgent(projectDir: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) throw new Error("OPENAI_API_KEY is required in .env");
  const openai = new OpenAI({ apiKey: openaiApiKey });

  // 1. Read schema and project context
  const schemePath = path.join(projectDir, "auto-ia-scheme.json");
  const scheme = JSON.parse(await fs.readFile(schemePath, "utf-8"));
  const files = await listFiles(projectDir);
  const { keyFiles, shadcnComponents } = await readKeyFiles(projectDir, files);

  // Summarize the file tree for the LLM prompt
  const fileTreeSummary = [
    ...files.filter(f =>
      f.startsWith("src/pages/") ||
      f === "src/App.tsx" ||
      f === "src/routes.tsx" ||
      f === "src/main.tsx"
    ),
    `src/components/ui/ (shadcn components: ${shadcnComponents.join(", ")})`
  ];

  // 2. Ask the LLM for a project plan
  const planPrompt = `
You are Auto, an AI software engineer that helps users build web applications.

You have the following capabilities:

ROLE & PERSONALITY:
- You are an experienced full-stack developer with expertise in React, TypeScript, Graphql and modern web technologies
- You break down complex problems into manageable steps
- You prioritize clean, maintainable code over clever solutions

You are an expert React developer. The project is a React starter with shadcn components already installed in src/components/ui. 
You are a skilled UX designer as well. Make sure to build beautiful UI along the way.
Stick to named imports/exports, that point directly to the component file, not the parent folder.

IMPORTANT - Import Rules:
- NEVER use barrel imports like: import { Input, Button } from '@/components/ui'
- ALWAYS import each shadcn component directly from its file:
  import { Input } from '@/components/ui/input'
  import { Button } from '@/components/ui/button'
  import { Slider } from '@/components/ui/slider'

When creating or updating files, always ensure that exported component/function names match the import names used elsewhere. For example, if a file is imported as { ListingForm } from "./ListingForm", it must export ListingForm as a named export.

IMPORTANT: The auto-ia-scheme.json is a high-level UI schema describing layout and structure, NOT a list of components to implement. For all UI elements, use the shadcn components already present in src/components/ui. Do NOT reimplement or duplicate shadcn components; import and use them directly.

Here is a summary of the file tree:
${JSON.stringify(fileTreeSummary, null, 2)}

Here are the names of all available shadcn UI components:
${JSON.stringify(shadcnComponents, null, 2)}

Here are the contents of key files:
${Object.entries(keyFiles).map(([f, c]) => `--- ${f} ---\n${c}\n`).join("\n")}

Here is a high-level UI schema (auto-ia-scheme.json) describing the intended app structure:
${JSON.stringify(scheme, null, 2)}

Your job: Plan and implement all necessary changes to make the project match the schema. 
- Reuse existing components where possible (especially shadcn components in src/components/ui, which you can treat as standard shadcn components).
- Only create new files if they do not exist.
- Update routing and navigation as needed.
- Output a JSON array of planned changes, each with:
  - action: "create" | "update"
  - file: relative file path
  - description: what/why

Respond with only a JSON array, no explanation, no markdown, no code block.
`;
  const planResp = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: "You are a helpful React developer assistant." },
      { role: "user", content: planPrompt }
    ],
    temperature: 0.2
  });
  const planText = planResp.choices[0]?.message?.content ?? '[]';
  let plan: { action: string, file: string, description: string }[] = [];
  try {
    const jsonText = extractJsonArray(planText);
    plan = JSON.parse(jsonText);
  } catch {
    console.error("Could not parse plan from LLM:", planText);
    return;
  }
  console.log("Planned changes:", plan);

  // 3. For each planned change, ask the LLM for the code or patch, and apply it
  for (const change of plan) {
    let fileContent = '';
    if (change.action === 'update') {
      // Read the current file content
      try {
        fileContent = await fs.readFile(path.join(projectDir, change.file), "utf-8");
      } catch { }
    }
    const codePrompt = `
You are an expert React developer. Here is a summary of the file tree:
${JSON.stringify(fileTreeSummary, null, 2)}

IMPORTANT - Import Rules:
- NEVER use barrel imports like: import { Input, Button } from '@/components/ui'
- ALWAYS import each shadcn component directly from its file:
  import { Input } from '@/components/ui/input'
  import { Button } from '@/components/ui/button'
  import { Slider } from '@/components/ui/slider'

Here are the names of all available shadcn UI components:
${JSON.stringify(shadcnComponents, null, 2)}

Here are the contents of key files:
${Object.entries(keyFiles).map(([f, c]) => `--- ${f} ---\n${c}\n`).join("\n")}

Here is a high-level UI schema (auto-ia-scheme.json):
${JSON.stringify(scheme, null, 2)}

Here is the planned change:
${JSON.stringify(change, null, 2)}

When creating or updating files, always ensure that exported component/function names match the import names used elsewhere. For example, if a file is imported as { ListingForm } from "./ListingForm", it must export ListingForm as a named export.

IMPORTANT: The auto-ia-scheme.json is a high-level UI schema describing layout and structure, NOT a list of components to implement. For all UI elements, use the shadcn components already present in src/components/ui. Do NOT reimplement or duplicate shadcn components; import and use them directly.

${change.action === 'update' ? `Here is the current content of ${change.file}:
${fileContent}
` : ''}
Please output ONLY the full new code for the file (no markdown, no triple backticks, just code, ready to write to disk).
`;
    const codeResp = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are a helpful React developer assistant." },
        { role: "user", content: codePrompt }
      ],
      temperature: 0.2
    });
    const code = codeResp.choices[0]?.message?.content ?? '';
    const outPath = path.join(projectDir, change.file);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, code, "utf-8");
    console.log(`${change.action === 'update' ? 'Updated' : 'Created'} ${change.file}`);
  }

  console.log('AI project implementation complete!');
}

// Example usage:
// pnpm --filter @auto-engineer/frontend-implementation ai-agent /absolute/path/to/your/react/project