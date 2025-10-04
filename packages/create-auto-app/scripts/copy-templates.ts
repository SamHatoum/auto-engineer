import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const packageDir = path.resolve(currentDir, '..');
const examplesDir = path.resolve(packageDir, '../../examples');
const templatesDir = path.resolve(packageDir, 'templates');
const supportFilesDir = path.join(examplesDir, 'support-files');

const excludePatterns = ['node_modules', '.turbo', 'dist', 'build', '**/*.js', '**/*.js.map'];

const shouldExclude = (filePath: string): boolean => {
  const basename = path.basename(filePath);

  if (basename.startsWith('.env') && basename !== '.env.example') {
    return true;
  }

  return excludePatterns.some((pattern) => {
    if (pattern.startsWith('**/')) {
      const extension = pattern.slice(3);
      return filePath.endsWith(extension);
    }
    return filePath.includes(pattern);
  });
};

const copyDirectory = async (src: string, dest: string): Promise<void> => {
  await fs.ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldExclude(srcPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copy(srcPath, destPath);
    }
  }
};

const mergeSupportFiles = async (templateDir: string): Promise<void> => {
  if (!(await fs.pathExists(supportFilesDir))) {
    console.warn('Warning: support-files directory not found');
    return;
  }

  const entries = await fs.readdir(supportFilesDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(supportFilesDir, entry.name);
    const destPath = path.join(templateDir, entry.name);

    if (shouldExclude(srcPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copy(srcPath, destPath);
    }
  }
};

const copyTemplates = async (): Promise<void> => {
  console.log('Cleaning templates directory...');
  await fs.remove(templatesDir);
  await fs.ensureDir(templatesDir);

  console.log('Reading examples directory...');
  const examples = await fs.readdir(examplesDir, { withFileTypes: true });

  for (const example of examples) {
    if (!example.isDirectory()) {
      continue;
    }

    if (example.name === 'support-files') {
      continue;
    }

    const exampleSrc = path.join(examplesDir, example.name);
    const exampleDest = path.join(templatesDir, example.name);

    console.log(`Copying ${example.name}...`);
    await copyDirectory(exampleSrc, exampleDest);

    console.log(`Merging support-files into ${example.name}...`);
    await mergeSupportFiles(exampleDest);
  }

  console.log('Templates copied successfully!');
};

copyTemplates().catch((error) => {
  console.error('Error copying templates:', error);
  process.exit(1);
});
