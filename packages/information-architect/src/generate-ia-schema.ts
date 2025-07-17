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
  // Find the section starting with '## Components' and parse the list
  const match = content.match(/## Components([\s\S]*)/);
  if (!match) return [];
  const lines = match[1].split('\n').map(line => line.trim()).filter(line => line.startsWith('- '));
  return lines.map(line => line.replace(/^-\s*/, ''));
}

async function main() {
  const [, , outputDir, ...flowFiles] = process.argv;
  if (!outputDir) {
    console.error('Usage: tsx src/generate-ia-schema.ts <output-dir> <flow-file-1> <flow-file-2> ...');
    process.exit(1);
  }

  const flows: string[] = await Promise.all(flowFiles.map((flow) => fs.readFile(flow, 'utf-8')));

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, 'auto-ia-scheme.json');

  let existingSchema: object | undefined = undefined;
  try {
    existingSchema = JSON.parse(await fs.readFile(outPath, 'utf-8')) as object;
    console.log('Existing IA schema found and will be taken into account.');
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code !== 'ENOENT') {
      console.error('Error reading existing IA schema:', err);
      process.exit(1);
    }
    // If file does not exist, just continue with existingSchema as undefined
  }

  const atomNames = await getAtomsFromMarkdown(outputDir);
  const atoms = atomNames.map(name => ({ name, props: [] }));

  // processFlowsWithAI only accepts three arguments
  const iaSchema = await processFlowsWithAI(flows, uxSchema, existingSchema, atoms);

  await fs.writeFile(outPath, JSON.stringify(iaSchema, null, 2));
  console.log(`Generated IA schema written to ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to generate IA schema:', err);
  process.exit(1);
});
