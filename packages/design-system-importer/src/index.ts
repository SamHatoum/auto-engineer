import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import * as Figma from 'figma-api';
import { FigmaComponent, FigmaComponentsBuilder } from './FigmaComponentsBuilder';

dotenv.config();

const api = new Figma.Api({
  personalAccessToken: process.env.FIGMA_PERSONAL_TOKEN as string,
});

async function getAllTsxFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await getAllTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getComponentNameFromFile(filePath: string): string {
  const file = path.basename(filePath, '.tsx');
  // Capitalize first letter
  return file.charAt(0).toUpperCase() + file.slice(1);
}

export async function generateDesignSystemMarkdown(inputDir: string, outputDir: string): Promise<void> {
  const files = await getAllTsxFiles(inputDir);
  if (files.length === 0) {
    console.warn('No .tsx files found in input directory.');
    return;
  }

  const componentNames = files.map(getComponentNameFromFile).sort();

  let md = '# Design System\n\n## Components\n\n';
  for (const name of componentNames) {
    md += `- ${name}\n`;
  }

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, 'design-system.md');
  await fs.writeFile(outPath, md);
}

async function copyFile(inputDir: string, outputDir: string, file: string): Promise<void> {
  const srcPath = path.join(inputDir, file);
  const destPath = path.join(outputDir, file);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.copyFile(srcPath, destPath);
}

export async function copyDesignSystemDocsAndUserPreferences(inputDir: string, outputDir: string): Promise<void> {
  await copyFile(inputDir, outputDir, 'design-system.md');
  await copyFile(inputDir, outputDir, 'design-system-principles.md');
}

async function getFigmaComponents(): Promise<{ name: string; description: string; thumbnail: string }[]> {
  let components: { name: string; description: string; thumbnail: string }[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await api.getFileComponentSets({ file_key: process.env.FIGMA_FILE_ID });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    components = response.meta.component_sets.map(
      (component: { name: string; description: string; thumbnail_url: string }) => ({
        name: component.name,
        description: component.description,
        thumbnail: component.thumbnail_url,
      }),
    );
    console.log('figma response: ', response);
  } catch (e) {
    console.error(e);
  }
  console.log(components.length);
  return components;
}

export function generateMarkdownFromComponents(
  components: { name: string; description: string; thumbnail: string }[],
): string {
  let md = '# Design System\n\n## Components\n\n';

  if (components.length === 0) {
    console.warn('No components found');
  }

  for (const component of components) {
    md += `### ${component.name}\nDescription: ${component.description}\nImage: ![${component.name} image](${component.thumbnail})\n\n`;
  }

  return md;
}

export async function importDesignSystemComponentsFromFigma(outputDir: string): Promise<void> {
  const figmaComponentsBuilder = new FigmaComponentsBuilder();
  // await figmaComponentsBuilder.withFigmaComponents();
  await figmaComponentsBuilder.withFigmaComponentSets();
  // await figmaComponentsBuilder.withAllFigmaInstanceNames();
  // figmaComponentsBuilder.withFilteredNamesForMui();
  figmaComponentsBuilder.withFilteredNamesForShadcn();
  const figmaComponents = figmaComponentsBuilder.build();

  console.log(figmaComponents.length);

  const generatedComponentsMDFile = generateMarkdownFromComponents(figmaComponents);
  // const mdWithImageAnalysis = await generateTextWithAI(`
  // Given this markdown file content:
  // ${generatedComponentsMDFile}
  //
  // ------ INSTRUCTIONS -------
  // !IMPORTANT: Only return with Markdown content, nothing else, I will be putting this straight in a .md file. Don't even start the file with \`\`\`markdown
  // For every component Image: Analyze the given image and add to the given component.
  // - add more content to the "Description:" part of the component.
  // - add "Hierarchy:" part under the component, returning the parts a component is build of. like [Button, Input]
  // `, AIProvider.OpenAI, { temperature: 0.2, maxTokens: 8000 })
  // console.log(JSON.stringify(mdWithImageAnalysis, null, 2));
  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, 'design-system.md');
  await fs.writeFile(outPath, generatedComponentsMDFile);
  // await copyFile("../../../examples/design-system/design-system-principles.md", outputDir, 'design-system-principles.md');
}

if (require.main === module) {
  const [, , inputDir, outputDir] = process.argv;
  if (!inputDir || !outputDir) {
    console.error('Usage: tsx src/index.ts <inputDir> <outputDir>');
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
