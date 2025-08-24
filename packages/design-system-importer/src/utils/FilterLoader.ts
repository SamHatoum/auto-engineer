import { extname, resolve as resolvePath, dirname, join } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import type { FilterFunctionType } from '../FigmaComponentsBuilder';
import createDebug from 'debug';

const debug = createDebug('design-system-importer:filter-loader');
const debugLoad = createDebug('design-system-importer:filter-loader:load');
const debugTS = createDebug('design-system-importer:filter-loader:typescript');
const debugStrategy = createDebug('design-system-importer:filter-loader:strategy');
const debugTemplate = createDebug('design-system-importer:filter-loader:template');

export class FilterLoader {
  private templatesDir: string;

  constructor() {
    debug('FilterLoader instance created');
    // Get the directory where template files are stored
    const currentFile = fileURLToPath(import.meta.url);
    this.templatesDir = join(dirname(currentFile), 'templates');
    debug('Templates directory: %s', this.templatesDir);
  }

  async loadFilter(filePath: string): Promise<FilterFunctionType> {
    debugLoad('Loading filter from: %s', filePath);

    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      debugLoad('ERROR: Invalid filter path provided');
      throw new Error('Filter file path is required');
    }

    const absolutePath = resolvePath(process.cwd(), filePath);
    debugLoad('Resolved absolute path: %s', absolutePath);

    if (!existsSync(absolutePath)) {
      debugLoad('ERROR: Filter file not found at %s', absolutePath);
      throw new Error(`Filter file not found: ${absolutePath}`);
    }

    const ext = extname(absolutePath).toLowerCase();
    debugLoad('File extension: %s', ext);

    // For TypeScript files, use tsx to load them
    if (ext === '.ts' || ext === '.tsx') {
      debugLoad('Detected TypeScript file, using TypeScript loader');
      return this.loadTypeScriptFilter(absolutePath);
    }

    // For JavaScript files, load directly
    debugLoad('Loading JavaScript file directly');
    const fileUrl = pathToFileURL(absolutePath).href;
    debugLoad('File URL: %s', fileUrl);

    const loadedUnknown: unknown = await import(fileUrl);
    const loadedModule = loadedUnknown as { filter?: unknown; default?: unknown };
    debugLoad('Module loaded, checking for filter function');

    if (typeof loadedModule.filter === 'function') {
      debugLoad('Found named export "filter"');
      return loadedModule.filter as FilterFunctionType;
    }

    if (typeof loadedModule.default === 'function') {
      debugLoad('Found default export, using as filter');
      console.warn('Using default export from filter module. Prefer a named export "filter".');
      return loadedModule.default as FilterFunctionType;
    }

    debugLoad('ERROR: No filter function found in module');
    throw new Error('No filter function found. Export a function named "filter" or as a default export from the file.');
  }

  private async loadTypeScriptFilter(filePath: string): Promise<FilterFunctionType> {
    debugTS('Loading TypeScript filter from: %s', filePath);
    // Create a temporary directory for our scripts
    const tempDir = mkdtempSync(join(tmpdir(), 'tsx-filter-'));
    debugTS('Created temp directory: %s', tempDir);

    try {
      const filterUrl = pathToFileURL(filePath).href;
      debugTS('Filter URL: %s', filterUrl);

      // Try different loading strategies in order
      const strategies = [
        () => this.tryNodeDirectLoad(tempDir, filterUrl),
        () => this.tryNpxTsxExport(tempDir, filterUrl),
        () => this.tryNodeLoaderOptions(tempDir, filterUrl),
      ];
      debugTS('Will try %d loading strategies', strategies.length);

      for (let i = 0; i < strategies.length; i++) {
        debugTS('Trying strategy %d/%d', i + 1, strategies.length);
        const result = await strategies[i]();
        if (result) {
          debugTS('Strategy %d succeeded!', i + 1);
          return result;
        }
        debugTS('Strategy %d failed, trying next...', i + 1);
      }

      debugTS('ERROR: All strategies failed to load TypeScript filter');
      throw new Error(
        `TypeScript filter cannot be loaded. ` +
          `Please ensure tsx is installed in your project:\n` +
          `  npm install -D tsx\n` +
          `Or provide a JavaScript version of your filter.`,
      );
    } catch (error) {
      debugTS('ERROR: Failed to load TypeScript filter: %O', error);
      throw new Error(
        `Failed to load TypeScript filter.\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}\n` +
          `Please ensure tsx is installed locally: npm install -D tsx`,
      );
    } finally {
      debugTS('Cleaning up temp directory: %s', tempDir);
      // Clean up temp files
      try {
        rmSync(tempDir, { recursive: true, force: true });
        debugTS('Temp directory cleaned up successfully');
      } catch (cleanupError) {
        debugTS('Warning: Failed to clean up temp directory: %O', cleanupError);
        // Ignore cleanup errors
      }
    }
  }

  private async tryNodeDirectLoad(tempDir: string, filterUrl: string): Promise<FilterFunctionType | null> {
    debugStrategy('Strategy: Node direct load');
    // First attempt: Try to run the loader script with Node.js directly
    const loaderFile = this.prepareTemplate(tempDir, 'tsx-loader.mjs', filterUrl);
    debugStrategy('Prepared loader file: %s', loaderFile);

    debugStrategy('Spawning node with experimental loader...');
    const result = spawnSync('node', [loaderFile], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      env: {
        ...process.env,
        NODE_OPTIONS: '--experimental-loader tsx',
      },
    });
    debugStrategy('Node process exit code: %d', result.status);

    if (result.status === 0) {
      debugStrategy('Node direct load succeeded, importing module');
      // Success! Now import the loader module to get the filter
      const loaderModule = (await import(pathToFileURL(loaderFile).href)) as { filter: FilterFunctionType };
      debugStrategy('Filter function retrieved from module');
      return loaderModule.filter;
    }

    debugStrategy('Node direct load failed');
    if (result.stderr) {
      debugStrategy('Error output: %s', result.stderr);
    }
    return null;
  }

  private async tryNpxTsxExport(tempDir: string, filterUrl: string): Promise<FilterFunctionType | null> {
    debugStrategy('Strategy: npx tsx export');
    // Second attempt: Use npx tsx to run a script that exports the filter
    const exportFile = this.prepareTemplate(tempDir, 'tsx-export.mjs', filterUrl);
    debugStrategy('Prepared export file: %s', exportFile);

    debugStrategy('Spawning npx tsx...');
    const npxResult = spawnSync('npx', ['tsx', exportFile], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      shell: true,
    });
    debugStrategy('npx process exit code: %d', npxResult.status);

    if (npxResult.status === 0 && npxResult.stdout) {
      debugStrategy('npx tsx succeeded, parsing output');
      try {
        const output = JSON.parse(npxResult.stdout) as { success: boolean; filterCode?: string };
        if (output.success === true && typeof output.filterCode === 'string' && output.filterCode.length > 0) {
          debugStrategy('Successfully parsed filter code, creating function');
          // Create a function from the filter code
          // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
          const filter = new Function('return ' + output.filterCode)() as FilterFunctionType;
          debugStrategy('Filter function created successfully');
          return filter;
        }
        debugStrategy('Output missing success flag or filter code');
      } catch (parseError) {
        debugStrategy('Failed to parse npx output: %O', parseError);
        // JSON parse failed, try another approach
      }
    } else {
      debugStrategy('npx tsx failed or no output');
      if (npxResult.stderr) {
        debugStrategy('Error output: %s', npxResult.stderr);
      }
    }

    return null;
  }

  private async tryNodeLoaderOptions(tempDir: string, filterUrl: string): Promise<FilterFunctionType | null> {
    debugStrategy('Strategy: Node loader options');
    // Third attempt: Create a wrapper that uses dynamic import with tsx
    const wrapperFile = this.prepareTemplate(tempDir, 'tsx-wrapper.mjs', filterUrl);
    debugStrategy('Prepared wrapper file: %s', wrapperFile);

    // Try with various Node.js loader configurations
    const loaderOptions = [
      ['--loader', 'tsx'],
      ['--experimental-loader', 'tsx'],
      ['--require', 'tsx'],
      ['--import', 'tsx'],
    ];
    debugStrategy('Will try %d loader configurations', loaderOptions.length);

    for (const options of loaderOptions) {
      debugStrategy('Trying loader options: %s', options.join(' '));
      const testResult = spawnSync('node', [...options, wrapperFile], {
        cwd: process.cwd(),
        encoding: 'utf-8',
        env: { ...process.env },
      });
      debugStrategy('Exit code: %d', testResult.status);

      if (testResult.status === 0) {
        debugStrategy('Configuration works! Loading final filter');
        // This configuration works! Use it to load the actual filter
        const finalFile = this.prepareTemplate(tempDir, 'tsx-final-loader.mjs', filterUrl);
        const finalModule = (await import(pathToFileURL(finalFile).href)) as { filter: FilterFunctionType };
        debugStrategy('Filter loaded successfully with options: %s', options.join(' '));
        return finalModule.filter;
      } else if (testResult.stderr) {
        debugStrategy('Error with %s: %s', options.join(' '), testResult.stderr);
      }
    }

    debugStrategy('All loader options failed');
    return null;
  }

  private prepareTemplate(tempDir: string, templateName: string, filterPath: string): string {
    debugTemplate('Preparing template: %s', templateName);
    debugTemplate('Filter path: %s', filterPath);
    const templatePath = join(this.templatesDir, templateName);
    const outputPath = join(tempDir, templateName);
    debugTemplate('Template path: %s', templatePath);
    debugTemplate('Output path: %s', outputPath);

    // Read the template
    let content: string;
    if (existsSync(templatePath)) {
      debugTemplate('Reading template from source');
      content = readFileSync(templatePath, 'utf-8');
    } else {
      debugTemplate('Template not in source, checking dist');
      // Fallback to dist directory if running from compiled code
      const distTemplatePath = templatePath.replace('/src/', '/dist/');
      debugTemplate('Checking dist path: %s', distTemplatePath);
      if (existsSync(distTemplatePath)) {
        debugTemplate('Reading template from dist');
        content = readFileSync(distTemplatePath, 'utf-8');
      } else {
        debugTemplate('ERROR: Template not found in source or dist');
        throw new Error(`Template not found: ${templateName}`);
      }
    }

    // Replace the placeholder with the actual filter path
    content = content.replace(/__FILTER_PATH__/g, filterPath);
    debugTemplate('Replaced filter path placeholder');

    // Write the prepared script
    writeFileSync(outputPath, content);
    debugTemplate('Written prepared script to: %s', outputPath);

    return outputPath;
  }

  cleanup(): void {
    debug('FilterLoader cleanup called');
    // No cleanup needed
  }
}
