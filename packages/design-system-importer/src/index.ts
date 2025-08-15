import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

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

export * from './commands/import-design-system';

async function copyFile(inputDir: string, outputDir: string, file: string): Promise<void> {
  const srcPath = path.join(inputDir, file);
  const destPath = path.join(outputDir, file);

  // Check if source file exists
  try {
    await fs.access(srcPath);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.copyFile(srcPath, destPath);
  } catch (error) {
    // File doesn't exist, skip copying
    console.log(`File ${file} not found in ${inputDir}, skipping...`, error);
  }
}

export async function copyDesignSystemDocsAndUserPreferences(inputDir: string, outputDir: string): Promise<void> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Try to copy existing files
  await copyFile(inputDir, outputDir, 'design-system.md');
  await copyFile(inputDir, outputDir, 'design-system-principles.md');

  // If design-system.md doesn't exist in output, try to generate it from TSX files
  const designSystemPath = path.join(outputDir, 'design-system.md');
  try {
    await fs.access(designSystemPath);
  } catch {
    // File doesn't exist, try to generate from TSX files if inputDir exists
    try {
      await fs.access(inputDir);
      const files = await getAllTsxFiles(inputDir);
      if (files.length > 0) {
        await generateDesignSystemMarkdown(inputDir, outputDir);
        console.log(`Generated design-system.md from ${files.length} component files`);
      } else {
        console.log(`No .tsx files found in ${inputDir} to generate design-system.md`);
      }
    } catch {
      console.log(`Input directory ${inputDir} not accessible`);
    }
  }
}

// Check if this file is being run directly
if (process.argv[1] === __filename) {
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
  copyDesignSystemDocsAndUserPreferences(inputDir, outputDir)
    .then(() => {
      console.log(`design-system.md copied to ${outputDir}`);
    })
    .catch((err) => {
      console.error('Error copying design-system.md:', err);
      process.exit(1);
    });
}
