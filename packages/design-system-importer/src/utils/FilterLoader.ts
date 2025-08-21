import { extname, resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
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

    // For TypeScript files, tell the user to install tsx locally
    if (ext === '.ts' || ext === '.tsx') {
      console.warn(
        `TypeScript filter file detected: ${filePath}\n` +
        `For TypeScript support, please ensure tsx is installed in your project:\n` +
        `  npm install -D tsx\n` +
        `Then the filter will be automatically loaded.\n` +
        `Attempting to load anyway...`
      );
      
      // Try to load it anyway - it might work if tsx is available globally or via other means
      try {
        const fileUrl = pathToFileURL(absolutePath).href;
        const loadedModule = await import(fileUrl);
        const filter = loadedModule.filter || loadedModule.default;
        
        if (typeof filter === 'function') {
          console.log('TypeScript filter loaded successfully');
          return filter as FilterFunctionType;
        }
      } catch (tsError) {
        // Check if it's a module not found error suggesting tsx isn't available
        const errorMessage = tsError instanceof Error ? tsError.message : String(tsError);
        if (errorMessage.includes('Unknown file extension ".ts"') || errorMessage.includes('Cannot find module')) {
          throw new Error(
            `TypeScript filter cannot be loaded without tsx.\n` +
            `Please install tsx in your project:\n` +
            `  npm install -D tsx\n` +
            `Or provide a compiled JavaScript version of your filter.`
          );
        }
        throw tsError;
      }
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

  cleanup(): void {
    // No cleanup needed
  }
}