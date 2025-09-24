import * as fs from 'fs/promises';
import * as path from 'path';
import ejs from 'ejs';
import { generateTextWithAI } from '@auto-engineer/ai-gateway';
import { flattenFigmaVariables, VariableCollection } from '../figma-helpers';

export type TemplateProps = Record<string, unknown>;

export type Mapper<TOptions = void> = (variablesPath: string, options: TOptions) => Promise<TemplateProps>;

const ignoreDirectories = new Set(['node_modules', '.turbo', 'dist', '.git', '.next', 'build']);

async function findFileRecursive(startDir: string, targetFileName: string): Promise<string | null> {
  const entries = await fs.readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirectories.has(entry.name)) continue;
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFileRecursive(fullPath, targetFileName);
      if (found != null) return found;
    } else if (entry.isFile() && entry.name === targetFileName) {
      return fullPath;
    }
  }
  return null;
}

export async function createFile(
  templateFileName: string,
  outputFileName: string,
  propsOrPromise: TemplateProps | Promise<TemplateProps>,
): Promise<void> {
  const cwd = process.cwd();
  const templatePath = await findFileRecursive(cwd, templateFileName);
  if (templatePath == null) {
    throw new Error(`Template file not found: ${templateFileName} (searched from ${cwd})`);
  }
  const outputPath = path.join(path.dirname(templatePath), outputFileName);

  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const props = await propsOrPromise;
  const renderedContent = ejs.render(templateContent.toString(), props);
  await fs.writeFile(outputPath, renderedContent);
  await fs.unlink(templatePath);
}

const BASE_SYSTEM_INSTRUCTIONS = `
  - Always return ONLY a JSON object as the response. No code fences, no explanations, no extra text.
  - Map Figma variables as accurately as possible to the requested structure.
  - If there is no exact match:
      - Try the closest match, but don't force irrelevant mappings.
      - If nothing fits, reset to a zero-like value or leave the property empty depending on the prompt.
  - Do not modify the given token values. Preserve formats exactly, especially HSL and multi-part values like "48 100% 50%".
  - Follow the requested JSON schema exactly. Do not add extra properties.
  - Only include the properties explicitly requested.
  - Do not wrap the output in any labels, prefixes, or explanations — JSON only.
`;

const readJson = async (filePath: string) => {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolute, 'utf-8');
  const json = JSON.parse(raw) as Record<string, unknown>;
  return 'variables' in json && typeof json.variables === 'object' ? json.variables : json;
};

export const templatePropsAIMapper: Mapper<{ prompt: string }> = async (variablesPath, options) => {
  const variablesJson = await readJson(variablesPath);
  const figmaVariables = flattenFigmaVariables(variablesJson as VariableCollection[]);
  const prompt =
    `I have these figma variables: ${JSON.stringify(figmaVariables)} \n\nSYSTEM INSTRUCTIONS: \n${BASE_SYSTEM_INSTRUCTIONS} \n` +
    options.prompt;
  const aiResponse = await generateTextWithAI(prompt, { maxTokens: 4000 });
  const props = JSON.parse(aiResponse) as TemplateProps;
  return props;
};

export const templatePropsMapper: Mapper = async (variablesPath) => {
  const variablesJson = (await readJson(variablesPath)) as TemplateProps;
  return variablesJson;
};
