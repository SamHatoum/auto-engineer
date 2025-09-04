import * as path from 'path';
import * as fs from 'fs/promises';
import createDebug from 'debug';
import { FigmaComponentsBuilder, type FilterFunctionType } from './FigmaComponentsBuilder.js';
import { generateMarkdownFromComponents } from './markdown-generator.js';

const debug = createDebug('design-system-importer');
const debugComponents = createDebug('design-system-importer:components');
const debugMarkdown = createDebug('design-system-importer:markdown');
const debugFiles = createDebug('design-system-importer:files');

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
  //   undefined,
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
