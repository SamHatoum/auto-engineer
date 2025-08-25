import * as fs from 'fs/promises';
import * as path from 'path';
import { AIProvider, generateTextWithAI } from '@auto-engineer/ai-gateway';

export type TemplateProps = Record<string, unknown>;

export type Mapper<TOptions = void> = (variablesPath: string, options: TOptions) => Promise<TemplateProps>;

const ignoreDirectories = new Set(['node_modules', '.turbo', 'dist', '.git', '.next', 'build']);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // const cwd = process.cwd();
  // const templatePath = await findFileRecursive(cwd, templateFileName);
  // if (!templatePath) {
  //   throw new Error(`Template file not found: ${templateFileName} (searched from ${cwd})`);
  // }
  // const outputPath = path.join(path.dirname(templatePath), outputFileName);

  // const templateContent = await fs.readFile(templatePath, 'utf-8');
  // const props = await propsOrPromise;
  // const renderedContent = ejs.render(templateContent.toString(), props);
  // await fs.writeFile(outputPath, renderedContent);
  // await fs.unlink(templatePath);
  console.log('createFile', templateFileName, outputFileName, propsOrPromise);
}

const BASE_SYSTEM_INSTRUCTIONS =
  "\n- don't include the ```json prefix, just the actual JSON data\n- return a JSON output ONLY, of the given css variables, and try your best to match all the figma variables to it.\n";

const readJson = async (filePath: string) => {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolute, 'utf-8');
  return JSON.parse(raw) as unknown;
};

export const templatePropsAIMapper: Mapper<{ prompt: string }> = async (variablesPath, options) => {
  const variablesJson = await readJson(variablesPath);
  const prompt =
    `I have these figma variables: ${JSON.stringify(variablesJson)} \n\nSYSTEM INSTRUCTIONS: \n${BASE_SYSTEM_INSTRUCTIONS} \n` +
    options.prompt;
  const aiResponse = await generateTextWithAI(prompt, AIProvider.OpenAI, { maxTokens: 4000 });
  const props = JSON.parse(aiResponse) as TemplateProps;
  return props;
};

export const templatePropsMapper: Mapper = async (variablesPath) => {
  const variablesJson = (await readJson(variablesPath)) as TemplateProps;
  return variablesJson;
};
