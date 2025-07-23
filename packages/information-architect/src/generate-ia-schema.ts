import { processFlowsWithAI } from './index';
import uxSchema from './auto-ux-schema.json';
import * as fs from 'fs/promises';
import * as path from 'path';

async function getAtomsFromMarkdown(designSystemDir: string): Promise<string[]> {
  const mdPath = path.join(designSystemDir, 'design-system.md');
  let content: string;
  try {
    content = await fs.readFile(mdPath, 'utf-8');
  } catch {
    return [];
  }
  // Find all lines that start with '### ' and extract the component name
  const lines = content.split('\n');
  const components: string[] = [];
  for (const line of lines) {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      components.push(match[1].trim());
    }
  }
  return components;
}

async function getUniqueSchemaPath(
  outputDir: string,
): Promise<{ filePath: string; existingSchema: object | undefined }> {
  await fs.mkdir(outputDir, { recursive: true });
  const baseFileName = 'auto-ia-scheme';
  const basePath = path.join(outputDir, baseFileName);
  let existingSchema: object | undefined = undefined;

  try {
    existingSchema = JSON.parse(await fs.readFile(`${basePath}.json`, 'utf-8')) as object;
    console.log('Existing IA schema found and will be taken into account.');
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code !== 'ENOENT') {
      console.error('Error reading existing IA schema:', err);
      process.exit(1);
    }
    // If file does not exist or is invalid, continue with existingSchema as undefined
  }

  let filePath = `${basePath}.json`;
  let counter = 1;
  while (
    await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false)
  ) {
    filePath = `${basePath}-${counter}.json`;
    counter++;
  }

  return { filePath, existingSchema };
}

async function main() {
  const [, , outputDir, ...flowFiles] = process.argv;
  if (!outputDir) {
    console.error('Usage: tsx src/generate-ia-schema.ts <output-dir> <flow-file-1> <flow-file-2> ...');
    process.exit(1);
  }

  const flows: string[] = await Promise.all(flowFiles.map((flow) => fs.readFile(flow, 'utf-8')));
  const { filePath, existingSchema } = await getUniqueSchemaPath(outputDir);
  const atomNames = await getAtomsFromMarkdown(outputDir);
  const atoms = atomNames.map((name) => ({ name, props: [] }));

  const iaSchema = await processFlowsWithAI(flows, uxSchema, existingSchema, atoms);

  await fs.writeFile(filePath, JSON.stringify(iaSchema, null, 2));
  console.log(`Generated IA schema written to ${filePath}`);
}

main().catch((err) => {
  console.error('Failed to generate IA schema:', err);
  process.exit(1);
});
