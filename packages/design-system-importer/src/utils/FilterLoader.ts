import { extname, resolve as resolvePath, dirname, join } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import type { FilterFunctionType } from '../FigmaComponentsBuilder';

export class FilterLoader {
  private templatesDir: string;

  constructor() {
    // Get the directory where template files are stored
    const currentFile = fileURLToPath(import.meta.url);
    this.templatesDir = join(dirname(currentFile), 'templates');
  }

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
    // Create a temporary directory for our scripts
    const tempDir = mkdtempSync(join(tmpdir(), 'tsx-filter-'));

    try {
      const filterUrl = pathToFileURL(filePath).href;

      // Try different loading strategies in order
      const strategies = [
        () => this.tryNodeDirectLoad(tempDir, filterUrl),
        () => this.tryNpxTsxExport(tempDir, filterUrl),
        () => this.tryNodeLoaderOptions(tempDir, filterUrl),
      ];

      for (const strategy of strategies) {
        const result = await strategy();
        if (result) {
          return result;
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

  private async tryNodeDirectLoad(tempDir: string, filterUrl: string): Promise<FilterFunctionType | null> {
    // First attempt: Try to run the loader script with Node.js directly
    const loaderFile = this.prepareTemplate(tempDir, 'tsx-loader.mjs', filterUrl);

    const result = spawnSync('node', [loaderFile], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      env: {
        ...process.env,
        NODE_OPTIONS: '--experimental-loader tsx',
      },
    });

    if (result.status === 0) {
      // Success! Now import the loader module to get the filter
      const loaderModule = (await import(pathToFileURL(loaderFile).href)) as { filter: FilterFunctionType };
      return loaderModule.filter;
    }

    return null;
  }

  private async tryNpxTsxExport(tempDir: string, filterUrl: string): Promise<FilterFunctionType | null> {
    // Second attempt: Use npx tsx to run a script that exports the filter
    const exportFile = this.prepareTemplate(tempDir, 'tsx-export.mjs', filterUrl);

    const npxResult = spawnSync('npx', ['tsx', exportFile], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      shell: true,
    });

    if (npxResult.status === 0 && npxResult.stdout) {
      try {
        const output = JSON.parse(npxResult.stdout) as { success: boolean; filterCode?: string };
        if (output.success === true && typeof output.filterCode === 'string' && output.filterCode.length > 0) {
          // Create a function from the filter code
          // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
          const filter = new Function('return ' + output.filterCode)() as FilterFunctionType;
          return filter;
        }
      } catch {
        // JSON parse failed, try another approach
      }
    }

    return null;
  }

  private async tryNodeLoaderOptions(tempDir: string, filterUrl: string): Promise<FilterFunctionType | null> {
    // Third attempt: Create a wrapper that uses dynamic import with tsx
    const wrapperFile = this.prepareTemplate(tempDir, 'tsx-wrapper.mjs', filterUrl);

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
        const finalFile = this.prepareTemplate(tempDir, 'tsx-final-loader.mjs', filterUrl);
        const finalModule = (await import(pathToFileURL(finalFile).href)) as { filter: FilterFunctionType };
        return finalModule.filter;
      }
    }

    return null;
  }

  private prepareTemplate(tempDir: string, templateName: string, filterPath: string): string {
    const templatePath = join(this.templatesDir, templateName);
    const outputPath = join(tempDir, templateName);

    // Read the template
    let content: string;
    if (existsSync(templatePath)) {
      content = readFileSync(templatePath, 'utf-8');
    } else {
      // Fallback to dist directory if running from compiled code
      const distTemplatePath = templatePath.replace('/src/', '/dist/');
      if (existsSync(distTemplatePath)) {
        content = readFileSync(distTemplatePath, 'utf-8');
      } else {
        throw new Error(`Template not found: ${templateName}`);
      }
    }

    // Replace the placeholder with the actual filter path
    content = content.replace(/__FILTER_PATH__/g, filterPath);

    // Write the prepared script
    writeFileSync(outputPath, content);

    return outputPath;
  }

  cleanup(): void {
    // No cleanup needed
  }
}
