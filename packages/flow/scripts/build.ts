#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

function run(command: string) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd: packageRoot });
}

function copyRecursive(src: string, dest: string) {
  const srcPath = path.resolve(packageRoot, src);
  const destPath = path.resolve(packageRoot, dest);

  if (!fs.existsSync(srcPath)) {
    console.log(`Source path does not exist: ${srcPath}`);
    return;
  }

  // Create destination directory if it doesn't exist
  fs.mkdirSync(destPath, { recursive: true });

  // Copy recursively
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const srcFile = path.join(srcPath, entry.name);
    const destFile = path.join(destPath, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(path.relative(packageRoot, srcFile), path.relative(packageRoot, destFile));
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

function removeDir(dir: string) {
  const dirPath = path.resolve(packageRoot, dir);
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`Removed: ${dir}`);
  }
}

async function main() {
  try {
    // Step 1: Run TypeScript compiler
    run('tsc');

    // Step 2: Fix ESM imports
    run('tsx ../../scripts/fix-esm-imports.ts');

    // Step 3: Remove existing dist/templates if it exists
    removeDir('dist/templates');

    // Step 4: Copy src/templates to dist/templates
    if (fs.existsSync(path.resolve(packageRoot, 'src/templates'))) {
      console.log('Copying src/templates to dist/templates');
      copyRecursive('src/templates', 'dist/templates');

      // Step 5: Create dist/src/templates directory
      fs.mkdirSync(path.resolve(packageRoot, 'dist/src/templates'), { recursive: true });

      // Step 6: Copy dist/templates/* to dist/src/templates/
      console.log('Copying dist/templates to dist/src/templates');
      copyRecursive('dist/templates', 'dist/src/templates');
    } else {
      console.log('No templates directory found, skipping template copying');
    }

    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

void main();
