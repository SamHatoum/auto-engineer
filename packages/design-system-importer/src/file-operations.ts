import * as path from 'path';
import * as fs from 'fs/promises';
import createDebug from 'debug';

const debugFiles = createDebug('auto:design-system-importer:files');
const debugComponents = createDebug('auto:design-system-importer:components');
const debugCopy = createDebug('auto:design-system-importer:copy');

export async function getAllTsxFiles(dir: string): Promise<string[]> {
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

export function getComponentNameFromFile(filePath: string): string {
  debugComponents('Extracting component name from: %s', filePath);
  const file = path.basename(filePath, '.tsx');
  // Capitalize first letter
  const componentName = file.charAt(0).toUpperCase() + file.slice(1);
  debugComponents('Component name: %s', componentName);
  return componentName;
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

      const { generateDesignSystemMarkdown } = await import('./markdown-generator.js');
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
