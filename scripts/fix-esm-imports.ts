#!/usr/bin/env node
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);

// Get the dist directory relative to where this script is called from
const distDir = process.cwd() + '/dist';

async function fixImports(dir: string): Promise<void> {
  const files = await readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dir, file.name);

    if (file.isDirectory()) {
      await fixImports(fullPath);
    } else if (file.name.endsWith('.js')) {
      let content = await readFile(fullPath, 'utf-8');

      // Fix relative imports
      content = content.replace(/from ['"](\.[^'"]+)['"];/g, (match, importPath) => {
        if (!importPath.endsWith('.js')) {
          // Check if this might be a directory import
          const possibleDirPath = join(dir, importPath);
          try {
            // Try to check if index.js exists in the directory
            if (existsSync(possibleDirPath) && existsSync(join(possibleDirPath, 'index.js'))) {
              return `from '${importPath}/index.js';`;
            }
          } catch (e) {
            // If we can't check, just add .js as before
          }
          return `from '${importPath}.js';`;
        }
        return match;
      });

      content = content.replace(/export \* from ['"](\.[^'"]+)['"];/g, (match, importPath) => {
        if (!importPath.endsWith('.js')) {
          // Check if this might be a directory import
          const possibleDirPath = join(dir, importPath);
          try {
            // Try to check if index.js exists in the directory
            if (existsSync(possibleDirPath) && existsSync(join(possibleDirPath, 'index.js'))) {
              return `export * from '${importPath}/index.js';`;
            }
          } catch (e) {
            // If we can't check, just add .js as before
          }
          return `export * from '${importPath}.js';`;
        }
        return match;
      });

      await writeFile(fullPath, content);
    }
  }
}

await fixImports(distDir);
console.log('Fixed ESM imports in dist/');
