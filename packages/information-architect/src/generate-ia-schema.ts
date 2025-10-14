import { processFlowsWithAI } from './index';
import uxSchema from './auto-ux-schema.json';
import * as fs from 'fs/promises';
import * as path from 'path';
import { type Model } from '@auto-engineer/narrative';

interface DesignSystemItem {
  name: string;
  description: string;
}

function determineSectionType(line: string): 'components' | 'layouts' | null {
  if (line === '## Components') return 'components';
  if (line === '## Layouts') return 'layouts';
  return null;
}

function addItemToSection(
  item: DesignSystemItem,
  sectionType: 'components' | 'layouts',
  components: DesignSystemItem[],
  layouts: DesignSystemItem[],
): void {
  if (sectionType === 'components') {
    components.push(item);
  } else {
    layouts.push(item);
  }
}

function processLine(
  line: string,
  currentSection: 'components' | 'layouts' | null,
  currentItem: DesignSystemItem | null,
  components: DesignSystemItem[],
  layouts: DesignSystemItem[],
): { section: typeof currentSection; item: typeof currentItem } {
  const trimmedLine = line.trim();

  if (trimmedLine.startsWith('## ')) {
    return {
      section: determineSectionType(trimmedLine),
      item: null,
    };
  }

  if (trimmedLine.startsWith('### ') && currentSection) {
    if (currentItem) {
      addItemToSection(currentItem, currentSection, components, layouts);
    }

    return {
      section: currentSection,
      item: {
        name: trimmedLine.replace(/^###\s+/, '').trim(),
        description: '',
      },
    };
  }

  if (currentItem && trimmedLine.startsWith('Description: ')) {
    currentItem.description = trimmedLine.replace(/^Description:\s+/, '').trim();
  }

  return { section: currentSection, item: currentItem };
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
    const result = processLine(line, currentSection, currentItem, components, layouts);
    currentSection = result.section;
    currentItem = result.item;
  }

  if (currentItem && currentSection) {
    addItemToSection(currentItem, currentSection, components, layouts);
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

async function getModelFromContext(outputDir: string): Promise<Model> {
  const modelPath = path.join(outputDir, 'schema.json');
  try {
    const modelContent = await fs.readFile(modelPath, 'utf-8');
    return JSON.parse(modelContent) as Model;
  } catch (error) {
    console.error(`Error reading model from ${modelPath}:`, error);
    console.error('Please ensure the model schema.json exists in the output directory.');
    process.exit(1);
  }
}

async function main() {
  const [, , outputDir] = process.argv;
  if (!outputDir) {
    console.error('Usage: tsx src/generate-ia-schema.ts <output-dir>');
    console.error('Note: The model schema.json must exist in the output directory.');
    process.exit(1);
  }

  const model = await getModelFromContext(outputDir);
  const { filePath, existingSchema } = await getUniqueSchemaPath(outputDir);
  const { components: atomsNames } = await getComponentsAndLayouts(outputDir);
  const atoms = atomsNames.map((atom) => ({ name: atom.name, props: [] }));

  const iaSchema = await processFlowsWithAI(model, uxSchema, existingSchema, atoms);

  await fs.writeFile(filePath, JSON.stringify(iaSchema, null, 2));
  console.log(`Generated IA schema written to ${filePath}`);
}

main().catch((err) => {
  console.error('Failed to generate IA schema:', err);
  process.exit(1);
});
