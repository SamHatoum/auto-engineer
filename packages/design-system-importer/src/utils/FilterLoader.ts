import { extname, resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { FilterFunctionType } from '../FigmaComponentsBuilder';

export class FilterLoader {
  async loadFilter(filePath: string): Promise<FilterFunctionType> {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new Error('Filter file path is required');
    }

    const absolutePath = resolvePath(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
      throw new Error(`Filter file not found: ${absolutePath}`);
    }

    const ext = extname(absolutePath).toLowerCase();

    // For TypeScript files, use tsx to load them
    if (ext === '.ts' || ext === '.tsx') {
      return this.loadTypeScriptFilter(absolutePath);
    }

    // For JavaScript files, load directly
    const fileUrl = pathToFileURL(absolutePath).href;
    const loadedUnknown: unknown = await import(fileUrl);
    const loadedModule = loadedUnknown as { filter?: unknown; default?: unknown };

    if (typeof loadedModule.filter === 'function') {
      return loadedModule.filter as FilterFunctionType;
    }

    if (typeof loadedModule.default === 'function') {
      console.warn('Using default export from filter module. Prefer a named export "filter".');
      return loadedModule.default as FilterFunctionType;
    }

    throw new Error('No filter function found. Export a function named "filter" or as a default export from the file.');
  }

  private async loadTypeScriptFilter(filePath: string): Promise<FilterFunctionType> {
    // Create a temporary directory for our loader script
    const tempDir = mkdtempSync(join(tmpdir(), 'tsx-filter-'));
    const tempFile = join(tempDir, 'loader.mjs');

    try {
      // Create a loader script that uses tsx to load and execute the TypeScript filter
      const loaderScript = `
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Try to find and register tsx
try {
  // First try to find tsx in the project's node_modules
  const require = createRequire(import.meta.url);
  let tsxPath;
  
  try {
    // Try to resolve tsx from the current working directory
    tsxPath = require.resolve('tsx/esm/api', { paths: ['${process.cwd()}'] });
  } catch {
    try {
      // Try alternative path for tsx v3
      tsxPath = require.resolve('tsx/esm', { paths: ['${process.cwd()}'] });
    } catch {
      // Try to find tsx anywhere
      tsxPath = require.resolve('tsx');
    }
  }
  
  // Import tsx and register it
  const tsx = await import(tsxPath);
  if (tsx.register) {
    tsx.register();
  }
} catch (e) {
  // If we can't find tsx's register, try using node's experimental loader
  try {
    register('tsx', pathToFileURL('./'));
  } catch {
    console.error('Could not register tsx loader:', e);
  }
}

// Now import the TypeScript filter file
const filterModule = await import('${pathToFileURL(filePath).href}');
const filter = filterModule.filter || filterModule.default;

if (typeof filter !== 'function') {
  throw new Error('No filter function found in TypeScript file');
}

// Export it so we can use it
export { filter };
`;

      writeFileSync(tempFile, loaderScript);

      // First attempt: Try to run the loader script with Node.js directly
      // This will work if tsx is installed locally and can be found
      const result = spawnSync('node', [tempFile], {
        cwd: process.cwd(),
        encoding: 'utf-8',
        env: {
          ...process.env,
          NODE_OPTIONS: '--experimental-loader tsx',
        },
      });

      if (result.status === 0) {
        // Success! Now import the loader module to get the filter
        const loaderModule = await import(pathToFileURL(tempFile).href);
        return loaderModule.filter as FilterFunctionType;
      }

      // Second attempt: Use npx tsx to run a script that exports the filter
      const exportScript = `
import * as filterModule from '${pathToFileURL(filePath).href}';
const filter = filterModule.filter || filterModule.default;
if (typeof filter === 'function') {
  // Output the filter as a module we can import
  console.log(JSON.stringify({
    success: true,
    filterCode: filter.toString()
  }));
} else {
  console.log(JSON.stringify({
    success: false,
    error: 'No filter function found'
  }));
}
`;

      const exportFile = join(tempDir, 'export.mjs');
      writeFileSync(exportFile, exportScript);

      const npxResult = spawnSync('npx', ['tsx', exportFile], {
        cwd: process.cwd(),
        encoding: 'utf-8',
        shell: true,
      });

      if (npxResult.status === 0 && npxResult.stdout) {
        try {
          const output = JSON.parse(npxResult.stdout);
          if (output.success && output.filterCode) {
            // Create a function from the filter code
            // eslint-disable-next-line no-new-func
            const filter = new Function('return ' + output.filterCode)();
            return filter as FilterFunctionType;
          }
        } catch {
          // JSON parse failed, try another approach
        }
      }

      // Third attempt: Create a wrapper that uses dynamic import with tsx
      const wrapperScript = `
#!/usr/bin/env node
import('${pathToFileURL(filePath).href}').then(module => {
  const filter = module.filter || module.default;
  if (typeof filter === 'function') {
    // Test it works
    filter({ name: 'test', type: 'COMPONENT', children: [] });
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

      const wrapperFile = join(tempDir, 'wrapper.mjs');
      writeFileSync(wrapperFile, wrapperScript);

      // Try with various Node.js loader configurations
      const loaderOptions = [
        ['--loader', 'tsx'],
        ['--experimental-loader', 'tsx'],
        ['--require', 'tsx'],
        ['--import', 'tsx'],
      ];

      for (const options of loaderOptions) {
        const testResult = spawnSync('node', [...options, wrapperFile], {
          cwd: process.cwd(),
          encoding: 'utf-8',
          env: { ...process.env },
        });

        if (testResult.status === 0) {
          // This configuration works! Use it to load the actual filter
          const finalLoaderScript = `
import { register } from 'node:module';
register('tsx', import.meta.url);
const filterModule = await import('${pathToFileURL(filePath).href}');
export const filter = filterModule.filter || filterModule.default;
`;
          const finalFile = join(tempDir, 'final.mjs');
          writeFileSync(finalFile, finalLoaderScript);

          const finalModule = await import(pathToFileURL(finalFile).href);
          return finalModule.filter as FilterFunctionType;
        }
      }

      throw new Error(
        `TypeScript filter cannot be loaded. ` +
          `Please ensure tsx is installed in your project:\n` +
          `  npm install -D tsx\n` +
          `Or provide a JavaScript version of your filter.`,
      );
    } catch (error) {
      throw new Error(
        `Failed to load TypeScript filter.\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}\n` +
          `Please ensure tsx is installed locally: npm install -D tsx`,
      );
    } finally {
      // Clean up temp files
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  cleanup(): void {
    // No cleanup needed
  }
}
