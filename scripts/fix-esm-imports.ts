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

      // First, temporarily replace template literals and strings containing imports
      // to protect them from modification
      const stringProtections: { placeholder: string; original: string }[] = [];
      let protectionIndex = 0;

      // Protect template literals (including multiline)
      content = content.replace(/`[^`]*`/g, (match) => {
        // Only protect if it contains import/export/from keywords
        if (match.includes('import') || match.includes('export') || match.includes('from')) {
          const placeholder = `__PROTECTED_TEMPLATE_${protectionIndex++}__`;
          stringProtections.push({ placeholder, original: match });
          return placeholder;
        }
        return match;
      });

      // Protect regular strings that look like they contain import statements
      content = content.replace(/(['"])([^'"]*)\1/g, (match, quote, str) => {
        // Only protect if it contains import/export/from keywords
        if (str.includes('import') || str.includes('export') || str.includes('from')) {
          const placeholder = `__PROTECTED_STRING_${protectionIndex++}__`;
          stringProtections.push({ placeholder, original: match });
          return placeholder;
        }
        return match;
      });

      // Fix relative imports (only those not in strings/templates)
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

      // Restore protected strings and templates
      for (const protection of stringProtections) {
        content = content.replace(protection.placeholder, protection.original);
      }

      await writeFile(fullPath, content);
    }
  }
}

if (existsSync(distDir)) {
  await fixImports(distDir);
  console.log('Fixed ESM imports in dist/');
} else {
  console.log('No dist directory found to fix imports in');
}
