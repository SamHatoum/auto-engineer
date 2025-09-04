import * as path from 'path';
import * as fs from 'fs/promises';
import createDebug from 'debug';
import { getAllTsxFiles, getComponentNameFromFile } from './file-operations.js';

const debugMarkdown = createDebug('design-system-importer:markdown');

export async function generateDesignSystemMarkdown(inputDir: string, outputDir: string): Promise<void> {
  debugMarkdown('Generating design system markdown from: %s to: %s', inputDir, outputDir);

  const files = await getAllTsxFiles(inputDir);
  if (files.length === 0) {
    debugMarkdown('WARNING: No .tsx files found in input directory');
    console.warn('No .tsx files found in input directory.');
    return;
  }

  debugMarkdown('Processing %d TSX files', files.length);
  const componentNames = files.map(getComponentNameFromFile).sort();
  debugMarkdown('Found %d unique components', componentNames.length);

  let md = '# Design System\n\n## Components\n\n';
  for (const name of componentNames) {
    md += `- ${name}\n`;
    debugMarkdown('Added component to markdown: %s', name);
  }

  debugMarkdown('Creating output directory: %s', outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const outPath = path.join(outputDir, 'design-system.md');
  debugMarkdown('Writing markdown to: %s', outPath);
  await fs.writeFile(outPath, md);
  debugMarkdown('Markdown file written successfully, size: %d bytes', md.length);
}

export function generateMarkdownFromComponents(
  components: { name: string; description: string; thumbnail: string }[],
): string {
  debugMarkdown('Generating markdown from %d components', components.length);
  let md = '# Design System\n\n## Components\n\n';

  if (components.length === 0) {
    debugMarkdown('WARNING: No components found to generate markdown');
    console.warn('No components found');
  }

  for (const [index, component] of components.entries()) {
    debugMarkdown('Processing component %d/%d: %s', index + 1, components.length, component.name);
    md += `### ${component.name}\nDescription: ${component.description}\nImage: ![${component.name} image](${component.thumbnail})\n\n`;
    debugMarkdown('Added component %s with description length: %d', component.name, component.description.length);
  }

  debugMarkdown('Generated markdown document, total size: %d bytes', md.length);
  return md;
}
