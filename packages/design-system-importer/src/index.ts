import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

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
  copyDesignSystemDocsAndUserPreferences(inputDir, outputDir)
    .then(() => {
      console.log(`design-system.md copied to ${outputDir}`);
    })
    .catch((err) => {
      console.error('Error copying design-system.md:', err);
      process.exit(1);
    });
}
