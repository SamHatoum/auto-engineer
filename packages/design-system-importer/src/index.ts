import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as Figma from 'figma-api';
import { FigmaComponentsBuilder, type FilterFunctionType } from './FigmaComponentsBuilder';
import createDebug from 'debug';
// import { AIProvider, generateTextWithAI } from '@auto-engineer/ai-gateway';

const debug = createDebug('design-system-importer');
const debugFiles = createDebug('design-system-importer:files');
const debugFigma = createDebug('design-system-importer:figma');
const debugMarkdown = createDebug('design-system-importer:markdown');
const debugComponents = createDebug('design-system-importer:components');
const debugCopy = createDebug('design-system-importer:copy');

dotenv.config();
debug('Design system importer initialized');

const __filename = fileURLToPath(import.meta.url);

debugFigma('Initializing Figma API with personal access token');
const api = new Figma.Api({
  personalAccessToken: process.env.FIGMA_PERSONAL_TOKEN as string,
});
debugFigma('Figma API initialized');

async function getAllTsxFiles(dir: string): Promise<string[]> {
  debugFiles('Scanning directory for TSX files: %s', dir);
  let results: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    debugFiles('Found %d entries in %s', entries.length, dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        debugFiles('Entering subdirectory: %s', entry.name);
        const subResults = await getAllTsxFiles(fullPath);
        results = results.concat(subResults);
        debugFiles('Found %d TSX files in %s', subResults.length, entry.name);
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        debugFiles('Found TSX file: %s', entry.name);
        results.push(fullPath);
      }
    }
  } catch (error) {
    debugFiles('Error reading directory %s: %O', dir, error);
  }

  debugFiles('Total TSX files found in %s: %d', dir, results.length);
  return results;
}

function getComponentNameFromFile(filePath: string): string {
  debugComponents('Extracting component name from: %s', filePath);
  const file = path.basename(filePath, '.tsx');
  // Capitalize first letter
  const componentName = file.charAt(0).toUpperCase() + file.slice(1);
  debugComponents('Component name: %s', componentName);
  return componentName;
}

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

async function copyFile(inputDir: string, outputDir: string, file: string): Promise<void> {
  const srcPath = path.join(inputDir, file);
  const destPath = path.join(outputDir, file);
  debugCopy('Attempting to copy file: %s from %s to %s', file, inputDir, outputDir);

  // Check if source file exists
  try {
    await fs.access(srcPath);
    debugCopy('Source file exists: %s', srcPath);

    debugCopy('Creating output directory: %s', outputDir);
    await fs.mkdir(outputDir, { recursive: true });

    await fs.copyFile(srcPath, destPath);
    debugCopy('Successfully copied %s to %s', file, destPath);
  } catch (error) {
    // File doesn't exist, skip copying
    debugCopy('File %s not found in %s, error: %O', file, inputDir, error);
    console.log(`File ${file} not found in ${inputDir}, skipping...`, error);
  }
}

export async function copyDesignSystemDocsAndUserPreferences(inputDir: string, outputDir: string): Promise<void> {
  debugCopy('Copying design system docs from %s to %s', inputDir, outputDir);

  // Ensure output directory exists
  debugCopy('Creating output directory: %s', outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  // Try to copy existing files
  debugCopy('Copying design-system.md...');
  await copyFile(inputDir, outputDir, 'design-system.md');

  debugCopy('Copying design-system-principles.md...');
  await copyFile(inputDir, outputDir, 'design-system-principles.md');

  // If design-system.md doesn't exist in output, try to generate it from TSX files
  const designSystemPath = path.join(outputDir, 'design-system.md');
  debugCopy('Checking if design-system.md exists at: %s', designSystemPath);

  try {
    await fs.access(designSystemPath);
    debugCopy('design-system.md already exists');
  } catch {
    debugCopy('design-system.md does not exist, attempting to generate from TSX files');
    // File doesn't exist, try to generate from TSX files if inputDir exists
    try {
      await fs.access(inputDir);
      debugCopy('Input directory is accessible: %s', inputDir);

      const files = await getAllTsxFiles(inputDir);
      if (files.length > 0) {
        debugCopy('Found %d TSX files, generating design-system.md', files.length);
        await generateDesignSystemMarkdown(inputDir, outputDir);
        console.log(`Generated design-system.md from ${files.length} component files`);
      } else {
        debugCopy('No TSX files found in %s', inputDir);
        console.log(`No .tsx files found in ${inputDir} to generate design-system.md`);
      }
    } catch (error) {
      debugCopy('Input directory %s not accessible: %O', inputDir, error);
      console.log(`Input directory ${inputDir} not accessible`);
    }
  }

  debugCopy('Design system docs copy/generation complete');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getFigmaComponents(): Promise<{ name: string; description: string; thumbnail: string }[]> {
  debugFigma('Fetching Figma components from file: %s', process.env.FIGMA_FILE_ID);
  let components: { name: string; description: string; thumbnail: string }[] = [];

  try {
    debugFigma('Making API call to Figma...');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await api.getFileComponentSets({ file_key: process.env.FIGMA_FILE_ID });
    debugFigma('Figma API response received');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    components = response.meta.component_sets.map(
      (component: { name: string; description: string; thumbnail_url: string }) => {
        debugFigma('Processing component: %s', component.name);
        return {
          name: component.name,
          description: component.description,
          thumbnail: component.thumbnail_url,
        };
      },
    );

    debugFigma('Successfully fetched %d components from Figma', components.length);
    console.log('figma response: ', response);
  } catch (e) {
    debugFigma('ERROR: Failed to fetch Figma components: %O', e);
    console.error(e);
  }

  console.log(components.length);
  return components;
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

export enum ImportStrategy {
  WITH_COMPONENTS = 'WITH_COMPONENTS',
  WITH_COMPONENT_SETS = 'WITH_COMPONENT_SETS',
  WITH_ALL_FIGMA_INSTANCES = 'WITH_ALL_FIGMA_INSTANCES',
}

export async function importDesignSystemComponentsFromFigma(
  outputDir: string,
  strategy: ImportStrategy = ImportStrategy.WITH_COMPONENT_SETS,
  filterFn?: FilterFunctionType,
): Promise<void> {
  debug('Starting Figma design system import');
  debug('Output directory: %s', outputDir);
  debug('Import strategy: %s', strategy);
  debug('Filter function provided: %s', filterFn ? 'yes' : 'no');

  const figmaComponentsBuilder = new FigmaComponentsBuilder();
  debugComponents('FigmaComponentsBuilder instance created');

  if (strategy === ImportStrategy.WITH_COMPONENTS) {
    debugComponents('Using strategy: WITH_COMPONENTS');
    await figmaComponentsBuilder.withFigmaComponents();
  } else if (strategy === ImportStrategy.WITH_COMPONENT_SETS) {
    debugComponents('Using strategy: WITH_COMPONENT_SETS');
    await figmaComponentsBuilder.withFigmaComponentSets();
  } else if (strategy === ImportStrategy.WITH_ALL_FIGMA_INSTANCES) {
    debugComponents('Using strategy: WITH_ALL_FIGMA_INSTANCES');
    await figmaComponentsBuilder.withAllFigmaInstanceNames();
  }
  debugComponents('Strategy applied successfully');

  // figmaComponentsBuilder.withFilteredNamesForMui();
  // figmaComponentsBuilder.withFilteredNamesForShadcn();

  if (filterFn) {
    debugComponents('Applying custom filter function');
    figmaComponentsBuilder.withFilter(filterFn);
  }

  debugComponents('Building Figma components...');
  const figmaComponents = figmaComponentsBuilder.build();
  debugComponents('Built %d Figma components', figmaComponents.length);

  console.log(figmaComponents.length);

  debugMarkdown('Generating markdown from Figma components');
  const generatedComponentsMDFile = generateMarkdownFromComponents(figmaComponents);
  debugMarkdown('Markdown generated, size: %d bytes', generatedComponentsMDFile.length);

  // const mdWithImageAnalysis = await generateTextWithAI(
  //   `
  // Given this markdown file content:
  // ${generatedComponentsMDFile}
  //
  // ------ INSTRUCTIONS -------
  // !IMPORTANT: Only return with Markdown content, nothing else, I will be putting this straight in a .md file. Don't even start the file with \`\`\`markdown
  // For every component Image: Analyze the given image and add to the given component.
  // - add more content to the "Description:" part of the component.
  // - add "Hierarchy:" part under the component, returning the parts a component is build of. like [Button, Input]
  // `,
  //   AIProvider.OpenAI,
  //   { temperature: 0.2, maxTokens: 8000 },
  // );
  // await fs.mkdir(outputDir, { recursive: true });

  // Parse the outputDir to determine if it's a file path or directory
  const isFilePath = outputDir.endsWith('.md');
  const actualOutputDir = isFilePath ? path.dirname(outputDir) : outputDir;
  const fileName = isFilePath ? path.basename(outputDir) : 'design-system.md';

  debugFiles('Creating output directory: %s', actualOutputDir);
  await fs.mkdir(actualOutputDir, { recursive: true });

  const outPath = path.join(actualOutputDir, fileName);
  debugFiles('Writing markdown to: %s', outPath);
  await fs.writeFile(outPath, generatedComponentsMDFile);
  debugFiles('Design system markdown written successfully');

  debug('Figma design system import complete');
}

// Check if this file is being run directly
if (process.argv[1] === __filename) {
  const [, , outputDir] = process.argv;
  if (!outputDir) {
    console.error('Usage: tsx src/index.ts <outputDir>');
    process.exit(1);
  }
  // generateDesignSystemMarkdown(inputDir, outputDir)
  //   .then(() => {
  //     console.log(`design-system.md generated in ${outputDir}`);
  //   })
  //   .catch((err) => {
  //     console.error('Error generating design-system.md:', err);
  //     process.exit(1);
  //   });
  // copyDesignSystemDocsAndUserPreferences(inputDir, outputDir)
  //   .then(() => {
  //     console.log(`design-system.md copied to ${outputDir}`);
  //   })
  //   .catch((err) => {
  //     console.error('Error copying design-system.md:', err);
  //     process.exit(1);
  //   });
  importDesignSystemComponentsFromFigma(outputDir)
    .then(() => {
      console.log(`design-system.md generated to ${outputDir}`);
    })
    .catch((err) => {
      console.error('Error generating design-system.md:', err);
      process.exit(1);
    });
}

import importDesignSystemHandler from './commands/import-design-system';
export const COMMANDS = [importDesignSystemHandler];
export type { FilterFunctionType } from './FigmaComponentsBuilder';
