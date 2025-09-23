import { processFlowsWithAI } from './index';
import uxSchema from './auto-ux-schema.json';
import * as fs from 'fs/promises';
import * as path from 'path';

interface DesignSystemItem {
  name: string;
  description: string;
}

async function getComponentsAndLayouts(
  designSystemDir: string,
): Promise<{ components: DesignSystemItem[]; layouts: DesignSystemItem[] }> {
  const mdPath = path.join(designSystemDir, 'design-system.md');
  let content: string;
  try {
    content = await fs.readFile(mdPath, 'utf-8');
  } catch {
    return { components: [], layouts: [] };
  }

  const lines = content.split('\n');
  const components: DesignSystemItem[] = [];
  const layouts: DesignSystemItem[] = [];
  let currentSection: 'components' | 'layouts' | null = null;
  let currentItem: DesignSystemItem | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('## ')) {
      currentSection = trimmedLine === '## Components' ? 'components' : trimmedLine === '## Layouts' ? 'layouts' : null;
      currentItem = null;
      continue;
    }

    if (trimmedLine.startsWith('### ') && currentSection) {
      if (currentItem) {
        if (currentSection === 'components') {
          components.push(currentItem);
        } else if (currentSection === 'layouts') {
          layouts.push(currentItem);
        }
      }

      currentItem = {
        name: trimmedLine.replace(/^###\s+/, '').trim(),
        description: '',
      };
      continue;
    }

    if (currentItem && trimmedLine.startsWith('Description: ')) {
      currentItem.description = trimmedLine.replace(/^Description:\s+/, '').trim();
    }
  }

  if (currentItem && currentSection) {
    if (currentSection === 'components') {
      components.push(currentItem);
    } else if (currentSection === 'layouts') {
      layouts.push(currentItem);
    }
  }

  return { components, layouts };
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
  const { components: atomsNames, layouts } = await getComponentsAndLayouts(outputDir);
  const atoms = atomsNames.map((atom) => ({ name: atom.name, props: [] }));

  const iaSchema = await processFlowsWithAI(flows, uxSchema, existingSchema, atoms, layouts);

  await fs.writeFile(filePath, JSON.stringify(iaSchema, null, 2));
  console.log(`Generated IA schema written to ${filePath}`);
}

main().catch((err) => {
  console.error('Failed to generate IA schema:', err);
  process.exit(1);
});
