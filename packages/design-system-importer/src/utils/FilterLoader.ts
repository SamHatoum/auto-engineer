import { extname, resolve as resolvePath } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createRequire } from 'module';
import type { FilterFunctionType } from '../FigmaComponentsBuilder';

export class FilterLoader {
  private tsxRegistered = false;
  private tsxUnregister: (() => void) | null = null;

  async loadFilter(filePath: string): Promise<FilterFunctionType> {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new Error('Filter file path is required');
    }

    const absolutePath = resolvePath(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
      throw new Error(`Filter file not found: ${absolutePath}`);
    }

    const ext = extname(absolutePath).toLowerCase();

    // Enable tsx loader for TS files at runtime
    if (ext === '.ts' || ext === '.tsx') {
      await this.ensureTsxSupport();
    }

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

  private async ensureTsxSupport(): Promise<void> {
    if (this.tsxRegistered) return;

    try {
      // Create a require function from this module's location to resolve tsx from our own dependencies
      const currentModulePath = fileURLToPath(import.meta.url);
      const require = createRequire(currentModulePath);
      
      // Try to resolve tsx/esm/api first (tsx 4.x), fallback to tsx/esm (tsx 3.x)
      let tsxPath: string;
      let tsxApi: { register: () => () => void } | null = null;
      
      try {
        tsxPath = require.resolve('tsx/esm/api');
        const tsxUnknown: unknown = await import(tsxPath);
        tsxApi = tsxUnknown as { register: () => () => void };
      } catch {
        // Fallback for tsx 3.x
        try {
          tsxPath = require.resolve('tsx/esm');
          const tsxModule: any = await import(tsxPath);
          // In tsx 3.x, the register function might be on the module directly
          if (tsxModule.register && typeof tsxModule.register === 'function') {
            tsxApi = { register: tsxModule.register };
          }
        } catch {
          // Last fallback - try the main tsx module
          tsxPath = require.resolve('tsx');
          const tsxModule: any = await import(tsxPath);
          if (tsxModule.register && typeof tsxModule.register === 'function') {
            tsxApi = { register: tsxModule.register };
          }
        }
      }

      if (tsxApi && typeof tsxApi.register === 'function') {
        this.tsxUnregister = tsxApi.register();
        this.tsxRegistered = true;
      } else {
        throw new Error('tsx register function not found');
      }
    } catch (error) {
      throw new Error(
        'TypeScript filter detected but tsx is not available.\n' +
          'Install tsx (npm i -D tsx) or provide a JavaScript file (.js/.mjs).\n' +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  cleanup(): void {
    if (this.tsxUnregister) {
      try {
        this.tsxUnregister();
      } finally {
        this.tsxUnregister = null;
        this.tsxRegistered = false;
      }
    }
  }
}
