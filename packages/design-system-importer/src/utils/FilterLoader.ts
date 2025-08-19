import { extname, resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
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
      const tsxUnknown: unknown = await import('tsx/esm/api');
      const tsxApi = tsxUnknown as { register: () => () => void };
      if (typeof tsxApi.register === 'function') {
        this.tsxUnregister = tsxApi.register();
        this.tsxRegistered = true;
      } else {
        throw new Error('tsx/esm/api.register is not a function');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error(
        'TypeScript filter detected but tsx is not available.\n' +
          'Install tsx (npm i -D tsx) or provide a JavaScript file (.js/.mjs).',
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
